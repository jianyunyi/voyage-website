import { describe, it, expect } from "vitest";
import { handleAuth } from "./auth";

// ---- 内存 KV mock（模拟 KVNamespace）----
class MemoryKV {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  async get(key: string, type?: "json" | "text"): Promise<string | unknown | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt && Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    if (type === "json") {
      try { return JSON.parse(e.value); } catch { return null; }
    }
    return e.value;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, { value, expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined });
  }
  async delete(key: string): Promise<void> { this.store.delete(key); }
}

const SECRET = "test-secret";

function env() {
  return { AUTH_KV: new MemoryKV() as unknown as KVNamespace, JWT_SECRET: SECRET };
}

function call(method: string, path: string, body?: unknown, envObj = env()) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleAuth(req, new URL(`http://localhost${path}`), envObj);
}

function cookie(resp: Response, name: string): string {
  return resp.headers.get("Set-Cookie")?.match(new RegExp(`${name}=([^;]+)`))?.[1] || "";
}

function callWithCookie(method: string, path: string, cookieHeader: string, body?: unknown, envObj = env()) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleAuth(req, new URL(`http://localhost${path}`), envObj);
}

async function json(resp: Response) {
  return { status: resp.status, data: await resp.json() as any };
}

describe("auth register", () => {
  it("注册成功返回 user + tokens", async () => {
    const e = env();
    const { status, data } = await json(await call("POST", "/api/auth/register", { nickname: "张三", password: "pass123" }, e));
    expect(status).toBe(201);
    expect(data.user.nickname).toBe("张三");
    expect(data.accessToken).toBeUndefined();
    expect(data.refreshToken).toBeUndefined();
    expect((await call("POST", "/api/auth/register", { nickname: "李明", password: "pass123" }, e)).headers.get("Set-Cookie")).toContain("voyagex_access=");
    // 密码不暴露
    expect(JSON.stringify(data)).not.toContain("pass123");
  });

  it("昵称过短/密码过短 → 400", async () => {
    expect((await json(await call("POST", "/api/auth/register", { nickname: "a", password: "pass123" }))).status).toBe(400);
    expect((await json(await call("POST", "/api/auth/register", { nickname: "合法昵称", password: "123" }))).status).toBe(400);
  });

  it("重复昵称 → 409", async () => {
    const e = env();
    await call("POST", "/api/auth/register", { nickname: "张三", password: "pass123" }, e);
    const { status } = await json(await call("POST", "/api/auth/register", { nickname: "张三", password: "other123" }, e));
    expect(status).toBe(409);
  });
});

describe("auth login", () => {
  it("正确密码登录成功；错误密码 401", async () => {
    const e = env();
    await call("POST", "/api/auth/register", { nickname: "李四", password: "pass123" }, e);
    const ok = await json(await call("POST", "/api/auth/login", { nickname: "李四", password: "pass123" }, e));
    expect(ok.status).toBe(200);
    expect(ok.data.user.nickname).toBe("李四");
    const bad = await json(await call("POST", "/api/auth/login", { nickname: "李四", password: "wrong" }, e));
    expect(bad.status).toBe(401);
    expect(bad.data.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("auth refresh rotation + reuse detection", () => {
  it("refresh 旋转：旧 token 作废，新 token 可用", async () => {
    const e = env();
    const regResponse = await call("POST", "/api/auth/register", { nickname: "王五", password: "pass123" }, e);
    const rt1 = cookie(regResponse, "voyagex_refresh");

    // 第一次 refresh → 旋转成功
    const r1Response = await callWithCookie("POST", "/api/auth/refresh", `voyagex_refresh=${rt1}`, undefined, e);
    const r1 = await json(r1Response);
    expect(r1.status).toBe(200);
    const rt2 = cookie(r1Response, "voyagex_refresh");
    expect(rt2).not.toBe(rt1);

    // 重用检测：旧 rt1 再 refresh → TOKEN_REUSED + 家族撤销
    const reuse = await json(await callWithCookie("POST", "/api/auth/refresh", `voyagex_refresh=${rt1}`, undefined, e));
    expect(reuse.status).toBe(401);
    expect(reuse.data.error.code).toBe("TOKEN_REUSED");

    // 家族撤销：rt2 也应失效
    const family = await json(await callWithCookie("POST", "/api/auth/refresh", `voyagex_refresh=${rt2}`, undefined, e));
    expect(family.status).toBe(401);
  });

  it("无效/伪造 refresh token → 401", async () => {
    const { status, data } = await json(await call("POST", "/api/auth/refresh", { refreshToken: "forged.token.here" }));
    expect(status).toBe(401);
    expect(data.error.code).toBe("INVALID_TOKEN");
  });
});

describe("auth me + logout", () => {
  it("me 需要有效 access token", async () => {
    const e = env();
    const regResponse = await call("POST", "/api/auth/register", { nickname: "赵六", password: "pass123" }, e);
    const at = cookie(regResponse, "voyagex_access");

    const ok = await json(await call("GET", "/api/auth/me", undefined, {
      ...e,
      // 附加 Authorization header 需要单独构造 request
    }));
    // 上面没带 token，预期 401
    expect(ok.status).toBe(401);

    // 带 token 的请求
    const req = new Request("http://localhost/api/auth/me", {
      headers: { Cookie: `voyagex_access=${at}` },
    });
    const me = await json(await handleAuth(req, new URL("http://localhost/api/auth/me"), e));
    expect(me.status).toBe(200);
    expect(me.data.user.nickname).toBe("赵六");
  });

  it("logout 后 refresh 失效", async () => {
    const e = env();
    const regResponse = await call("POST", "/api/auth/register", { nickname: "钱七", password: "pass123" }, e);
    const rt = cookie(regResponse, "voyagex_refresh");

    const out = await json(await callWithCookie("POST", "/api/auth/logout", `voyagex_refresh=${rt}`, undefined, e));
    expect(out.status).toBe(200);

    const again = await json(await callWithCookie("POST", "/api/auth/refresh", `voyagex_refresh=${rt}`, undefined, e));
    expect(again.status).toBe(401);
  });
});
