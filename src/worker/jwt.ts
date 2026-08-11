/**
 * VoyageX JWT 工具 — HS256（Web Crypto，零依赖）
 *
 * 用于 access/refresh token 的签名与验证。
 * Cloudflare Worker 环境自带 Web Crypto API，无需第三方库。
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface JwtPayload {
  sub: string;      // subject (userId)
  type: string;     // "access" | "refresh"
  jti: string;      // token id
  iat: number;      // issued at
  exp: number;      // expires at
}

/** HS256 签名 JWT */
export async function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
  expiresInSec: number
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + expiresInSec };
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(full)));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(sig))}`;
}

/** 验证 JWT，返回 payload；无效/过期返回 null */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "HMAC", key, base64UrlDecode(sigB64), encoder.encode(`${headerB64}.${payloadB64}`)
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64))) as JwtPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// 密码哈希（PBKDF2，Web Crypto）
// ============================================================

const PBKDF2_ITERATIONS = 100_000;

/** 生成随机 salt（16 字节 hex） */
export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/** PBKDF2 密码哈希（返回 hex） */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key, 256
  );
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
}

/** 常量时间比较（防时序攻击） */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
