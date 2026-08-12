import { describe, it, expect } from "vitest";
import { handleSubmissions } from "./submissions";
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
  const resp = await handleAuth(req, new URL('http://localhost/api/auth/register'), e);
  const data = await resp.json() as any;
  return data.accessToken as string;
}

function authed(method: string, path: string, token: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function statusOf(resp: Response) {
  return { status: resp.status, data: await resp.json() as any };
}


describe("submissions 用户投稿", () => {
  it("无 token → 401", async () => {
    const req = new Request("http://localhost/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "guide", title: "x", content: "y" }) });
    const { status } = await statusOf(await handleSubmissions(req, new URL('http://localhost/api/submissions'), env()));
    expect(status).toBe(401);
  });

  it("投稿创建（201 + pending）", async () => {
    const e = env();
    const atA = await regToken(e, "投稿甲");
    const created = await statusOf(await handleSubmissions(authed("POST", "/api/submissions", atA, { type: "guide", title: "成都5日", destination: "成都", content: "详细内容" }), new URL('http://localhost/api/submissions'), e));
    expect(created.status).toBe(201);
    expect(created.data.submission.status).toBe("pending");
    expect(created.data.submission.id).toMatch(/^sub_/);
  });

  it("缺字段 → 400；非法类型 → 400", async () => {
    const e = env();
    const atA = await regToken(e, "投稿校验");
    const bad1 = await statusOf(await handleSubmissions(authed("POST", "/api/submissions", atA, { type: "guide", content: "y" }), new URL('http://localhost/api/submissions'), e));
    expect(bad1.status).toBe(400);
    const bad2 = await statusOf(await handleSubmissions(authed("POST", "/api/submissions", atA, { type: "hack", title: "x", content: "y" }), new URL('http://localhost/api/submissions'), e));
    expect(bad2.status).toBe(400);
  });

  it("我的投稿列表 + 用户隔离", async () => {
    const e = env();
    const atA = await regToken(e, "投稿列表");
    const atB = await regToken(e, "投稿隔离");
    await handleSubmissions(authed("POST", "/api/submissions", atA, { type: "food", title: "宽窄巷子火锅", content: "好吃" }), new URL('http://localhost/api/submissions'), e);
    const list = await statusOf(await handleSubmissions(authed("GET", "/api/submissions", atA), new URL('http://localhost/api/submissions'), e));
    expect(list.data.count).toBe(1);
    expect(list.data.submissions[0].title).toBe("宽窄巷子火锅");
    const b = await statusOf(await handleSubmissions(authed("GET", "/api/submissions", atB), new URL('http://localhost/api/submissions'), e));
    expect(b.data.count).toBe(0);
  });
});
