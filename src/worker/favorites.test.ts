import { describe, it, expect } from "vitest";
import { handleFavorites } from "./favorites";
import { handleAuth } from "./auth";

class MemoryKV {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  async get(key: string, type?: "json" | "text"): Promise<string | unknown | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt && Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    if (type === "json") { try { return JSON.parse(e.value); } catch { return null; } }
    return e.value;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, { value, expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined });
  }
  async delete(key: string): Promise<void> { this.store.delete(key); }
}

const SECRET = "test-secret";

function env() {
  return { FAVORITES_KV: new MemoryKV() as unknown as KVNamespace, AUTH_KV: new MemoryKV() as unknown as KVNamespace, JWT_SECRET: SECRET };
}

async function regToken(e: ReturnType<typeof env>, nickname: string) {
  const req = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password: "pass123" }),
  });
  const resp = await handleAuth(req, new URL("http://localhost/api/auth/register"), e);
  const value = resp.headers.get("Set-Cookie")?.match(/voyagex_access=([^;]+)/)?.[1] || "";
  return `voyagex_access=${value}`;
}

function authed(method: string, path: string, token: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function statusOf(resp: Response) {
  return { status: resp.status, data: await resp.json() as any };
}


describe("favorites 用户隔离", () => {
  it("无 token → 401", async () => {
    const req = new Request("http://localhost/api/user/favorites");
    const { status, data } = await statusOf(await handleFavorites(req, new URL("http://localhost/api/user/favorites"), env()));
    expect(status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("A 添加收藏，B 不可见（隔离）", async () => {
    const e = env();
    const atA = await regToken(e, "收藏甲");
    const atB = await regToken(e, "收藏乙");

    const add = await statusOf(await handleFavorites(authed("POST", "/api/user/favorites", atA, { id: "hotel-1", type: "hotel", title: "A的酒店" }), new URL("http://localhost/api/user/favorites"), e));
    expect(add.status).toBe(200);
    expect(add.data.count).toBe(1);

    const b = await statusOf(await handleFavorites(authed("GET", "/api/user/favorites", atB), new URL("http://localhost/api/user/favorites"), e));
    expect(b.data.count).toBe(0);

    const a = await statusOf(await handleFavorites(authed("GET", "/api/user/favorites", atA), new URL("http://localhost/api/user/favorites"), e));
    expect(a.data.count).toBe(1);
    expect(a.data.favorites[0].title).toBe("A的酒店");
  });

  it("重复添加幂等（去重）", async () => {
    const e = env();
    const atA = await regToken(e, "收藏幂等");
    await handleFavorites(authed("POST", "/api/user/favorites", atA, { id: "hotel-1", type: "hotel", title: "x" }), new URL("http://localhost/api/user/favorites"), e);
    const again = await statusOf(await handleFavorites(authed("POST", "/api/user/favorites", atA, { id: "hotel-1", type: "hotel", title: "x" }), new URL("http://localhost/api/user/favorites"), e));
    expect(again.data.count).toBe(1);
  });

  it("删除收藏", async () => {
    const e = env();
    const atA = await regToken(e, "收藏删");
    await handleFavorites(authed("POST", "/api/user/favorites", atA, { id: "hotel-1", type: "hotel", title: "x" }), new URL("http://localhost/api/user/favorites"), e);
    const del = await statusOf(await handleFavorites(authed("DELETE", "/api/user/favorites/hotel-1", atA), new URL("http://localhost/api/user/favorites/hotel-1"), e));
    expect(del.data.count).toBe(0);
  });
});
