/**
 * VoyageX Auth API — JWT access/refresh 认证
 *
 * 端点：
 *   POST /api/auth/register   {nickname, password} → 注册并登录
 *   POST /api/auth/login      {nickname, password} → {accessToken, refreshToken, user}
 *   POST /api/auth/refresh    {refreshToken}       → 旋转 + 重用检测
 *   POST /api/auth/logout     {refreshToken}       → 撤销
 *   GET  /api/auth/me         Bearer accessToken   → 当前用户
 *
 * 安全设计（企业级）：
 * - accessToken: HS256 JWT，15 分钟短命
 * - refreshToken: HS256 JWT + 服务端 KV 状态，7 天
 * - Refresh Token Rotation：每次 refresh 换新 token，旧 token 立即作废
 * - Reuse Detection：已轮换的旧 refresh token 再次使用 = 盗用信号
 *   → 撤销该用户整个 token 家族（所有 refresh 失效）
 * - 密码 PBKDF2 哈希（100k 迭代）+ 随机 salt，不存明文
 * - 常量时间比较防时序攻击
 */

import { signJwt, verifyJwt, hashPassword, randomSalt, safeEqual, randomId } from "./jwt";

interface AuthEnv {
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

interface User {
  id: string;
  nickname: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

interface RefreshRecord {
  userId: string;
  expiresAt: number;
  rotated: boolean; // 已被轮换（旧 token 标记）
}

const ACCESS_TTL = 15 * 60;        // 15 分钟
const REFRESH_TTL = 7 * 24 * 3600; // 7 天

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// KV key 助手
const kUser = (id: string) => `user:${id}`;
const kByName = (nickname: string) => `userByName:${nickname.toLowerCase()}`;
const kRefresh = (jti: string) => `refresh:${jti}`;
const kFamily = (userId: string) => `userTokens:${userId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

// ============================================================
// Token 发行
// ============================================================

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 发行 access + refresh（refresh 落 KV 并加入家族） */
async function issueTokens(env: AuthEnv, user: User): Promise<TokenPair> {
  const accessToken = await signJwt(
    { sub: user.id, type: "access", jti: randomId("at") },
    env.JWT_SECRET, ACCESS_TTL
  );

  const jti = randomId("rt");
  const refreshToken = await signJwt(
    { sub: user.id, type: "refresh", jti },
    env.JWT_SECRET, REFRESH_TTL
  );

  // 存 KV：refresh 记录 + 加入用户家族
  const record: RefreshRecord = { userId: user.id, expiresAt: Date.now() + REFRESH_TTL * 1000, rotated: false };
  await env.AUTH_KV.put(kRefresh(jti), JSON.stringify(record), { expirationTtl: REFRESH_TTL });

  const family = await getFamily(env, user.id);
  family.push(jti);
  await env.AUTH_KV.put(kFamily(user.id), JSON.stringify(family), { expirationTtl: REFRESH_TTL * 2 });

  return { accessToken, refreshToken };
}

async function getFamily(env: AuthEnv, userId: string): Promise<string[]> {
  const raw = await env.AUTH_KV.get(kFamily(userId), "json");
  return Array.isArray(raw) ? raw as string[] : [];
}

/** 撤销用户全部 refresh token（重用攻击响应） */
async function revokeFamily(env: AuthEnv, userId: string): Promise<void> {
  const family = await getFamily(env, userId);
  for (const jti of family) {
    await env.AUTH_KV.delete(kRefresh(jti));
  }
  await env.AUTH_KV.delete(kFamily(userId));
}

// ============================================================
// 端点实现
// ============================================================

export async function handleAuth(request: Request, url: URL, env: AuthEnv): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/auth\//, ""); // register|login|refresh|logout|me

  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    switch (path) {
      case "register": return await handleRegister(request, env);
      case "login": return await handleLogin(request, env);
      case "refresh": return await handleRefresh(request, env);
      case "logout": return await handleLogout(request, env);
      case "me": return await handleMe(request, env);
      default:
        return json({ error: { code: "NOT_FOUND", message: "auth endpoint not found" } }, 404);
    }
  } catch (e) {
    console.error("[auth] error:", e);
    return json({ error: { code: "INTERNAL", message: "服务器内部错误" } }, 500);
  }
}

// ---- POST /api/auth/register ----

async function handleRegister(request: Request, env: AuthEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as { nickname?: string; password?: string } | null;
  const nickname = body?.nickname?.trim() || "";
  const password = body?.password || "";

  if (nickname.length < 2 || nickname.length > 20) {
    return json({ error: { code: "INVALID_NICKNAME", message: "昵称需 2-20 个字符" } }, 400);
  }
  if (password.length < 6) {
    return json({ error: { code: "INVALID_PASSWORD", message: "密码至少 6 位" } }, 400);
  }

  // 唯一性检查
  const existingId = await env.AUTH_KV.get(kByName(nickname));
  if (existingId) {
    return json({ error: { code: "NICKNAME_TAKEN", message: "该昵称已被注册" } }, 409);
  }

  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const user: User = {
    id: randomId("u"),
    nickname,
    passwordHash,
    salt,
    createdAt: Date.now(),
  };

  await env.AUTH_KV.put(kUser(user.id), JSON.stringify(user));
  await env.AUTH_KV.put(kByName(nickname), user.id);

  const tokens = await issueTokens(env, user);
  return json({ user: publicUser(user), ...tokens }, 201);
}

// ---- POST /api/auth/login ----

async function handleLogin(request: Request, env: AuthEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as { nickname?: string; password?: string } | null;
  const nickname = body?.nickname?.trim() || "";
  const password = body?.password || "";

  const userId = await env.AUTH_KV.get(kByName(nickname));
  if (!userId) {
    return json({ error: { code: "INVALID_CREDENTIALS", message: "昵称或密码错误" } }, 401);
  }
  const raw = await env.AUTH_KV.get(kUser(userId));
  if (!raw) return json({ error: { code: "INVALID_CREDENTIALS", message: "昵称或密码错误" } }, 401);
  const user = JSON.parse(raw) as User;

  const hash = await hashPassword(password, user.salt);
  if (!safeEqual(hash, user.passwordHash)) {
    return json({ error: { code: "INVALID_CREDENTIALS", message: "昵称或密码错误" } }, 401);
  }

  const tokens = await issueTokens(env, user);
  return json({ user: publicUser(user), ...tokens }, 200);
}

// ---- POST /api/auth/refresh（旋转 + 重用检测）----

async function handleRefresh(request: Request, env: AuthEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as { refreshToken?: string } | null;
  const token = body?.refreshToken || "";
  if (!token) return json({ error: { code: "MISSING_TOKEN", message: "缺少 refreshToken" } }, 400);

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload || payload.type !== "refresh") {
    return json({ error: { code: "INVALID_TOKEN", message: "无效的 refresh token" } }, 401);
  }

  // 查 KV 状态
  const raw = await env.AUTH_KV.get(kRefresh(payload.jti));
  if (!raw) {
    return json({ error: { code: "INVALID_TOKEN", message: "refresh token 已失效" } }, 401);
  }
  const record = JSON.parse(raw) as RefreshRecord;
  if (record.expiresAt < Date.now()) {
    await env.AUTH_KV.delete(kRefresh(payload.jti));
    return json({ error: { code: "TOKEN_EXPIRED", message: "refresh token 已过期" } }, 401);
  }

  // ===== 重用检测 =====
  // 该 jti 已被轮换（rotated=true）却又被使用 = 攻击者重放旧 token
  if (record.rotated) {
    console.warn(`[auth] REUSE DETECTED for user ${record.userId}, revoking family`);
    await revokeFamily(env, record.userId);
    return json({ error: { code: "TOKEN_REUSED", message: "检测到 token 重用，已撤销全部会话，请重新登录" } }, 401);
  }

  // 正常旋转：标记旧 token 已轮换 + 从家族移除 + 发新 token
  record.rotated = true;
  await env.AUTH_KV.put(kRefresh(payload.jti), JSON.stringify(record), { expirationTtl: REFRESH_TTL });

  const family = await getFamily(env, record.userId);
  await env.AUTH_KV.put(kFamily(record.userId), JSON.stringify(family.filter(j => j !== payload.jti)), { expirationTtl: REFRESH_TTL * 2 });

  // 取用户（新 token 用）
  const userRaw = await env.AUTH_KV.get(kUser(record.userId));
  if (!userRaw) return json({ error: { code: "INVALID_TOKEN", message: "用户不存在" } }, 401);
  const user = JSON.parse(userRaw) as User;

  const tokens = await issueTokens(env, user);
  return json(tokens, 200);
}

// ---- POST /api/auth/logout ----

async function handleLogout(request: Request, env: AuthEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as { refreshToken?: string } | null;
  const token = body?.refreshToken || "";
  if (!token) return json({ error: { code: "MISSING_TOKEN", message: "缺少 refreshToken" } }, 400);

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (payload && payload.type === "refresh") {
    await env.AUTH_KV.delete(kRefresh(payload.jti));
    const family = await getFamily(env, payload.sub);
    await env.AUTH_KV.put(kFamily(payload.sub), JSON.stringify(family.filter(j => j !== payload.jti)), { expirationTtl: REFRESH_TTL * 2 });
  }
  return json({ success: true }, 200);
}

// ---- GET /api/auth/me ----

async function handleMe(request: Request, env: AuthEnv): Promise<Response> {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: { code: "UNAUTHORIZED", message: "未登录" } }, 401);

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload || payload.type !== "access") {
    return json({ error: { code: "UNAUTHORIZED", message: "登录已过期" } }, 401);
  }

  const raw = await env.AUTH_KV.get(kUser(payload.sub));
  if (!raw) return json({ error: { code: "UNAUTHORIZED", message: "用户不存在" } }, 401);
  const user = JSON.parse(raw) as User;
  return json({ user: publicUser(user) }, 200);
}

function publicUser(user: User) {
  return { id: user.id, nickname: user.nickname, createdAt: user.createdAt };
}

// ============================================================
// 鉴权辅助（供 favorites/submissions 等模块复用）
// ============================================================

/** 从 Authorization: Bearer <accessToken> 解析 userId；无效返回 null */
export async function resolveUser(request: Request, env: { AUTH_KV: KVNamespace; JWT_SECRET: string }): Promise<User | null> {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload || payload.type !== "access") return null;

  const raw = await env.AUTH_KV.get(kUser(payload.sub));
  if (!raw) return null;
  return JSON.parse(raw) as User;
}
