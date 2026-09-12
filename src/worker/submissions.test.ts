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

function env(adminIds = "") {
  return { FAVORITES_KV: new MemoryKV() as unknown as KVNamespace, AUTH_KV: new MemoryKV() as unknown as KVNamespace, JWT_SECRET: SECRET, ADMIN_IDS: adminIds };
}

async function regToken(e: ReturnType<typeof env>, nickname: string) {
  const req = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password: "pass123" }),
  });
  const resp = await handleAuth(req, new URL('http://localhost/api/auth/register'), e);
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

  it("管理员审核通过后进入公开攻略列表", async () => {
    const e = env();
    const authorCookie = await regToken(e, "公开攻略作者");
    const adminCookie = await regToken(e, "审核管理员");
    const adminUser = await handleAuth(new Request("http://localhost/api/auth/me", { headers: { Cookie: adminCookie } }), new URL("http://localhost/api/auth/me"), e);
    const adminId = (await adminUser.json() as any).user.id;
    e.ADMIN_IDS = adminId;
    const created = await statusOf(await handleSubmissions(authed("POST", "/api/submissions", authorCookie, {
      type: "guide", title: "管理员审核攻略", destination: "成都", content: "第一段\n第二段",
      extra: { days: 3, budget: 1800, tags: ["周末游"], highlights: ["宽窄巷子"], image: "data:image/png;base64,AA==" },
    }), new URL("http://localhost/api/submissions"), e));
    const adminList = await statusOf(await handleSubmissions(authed("GET", "/api/submissions/admin", adminCookie), new URL("http://localhost/api/submissions/admin"), e));
    expect(adminList.status).toBe(200);
    expect(adminList.data.count).toBe(1);
    const approved = await statusOf(await handleSubmissions(authed("POST", `/api/submissions/${created.data.submission.id}/approve`, adminCookie), new URL(`http://localhost/api/submissions/${created.data.submission.id}/approve`), e));
    expect(approved.status).toBe(200);
    const publicList = await statusOf(await handlePublic(new Request("http://localhost/api/guides/public"), new URL("http://localhost/api/guides/public"), e));
    expect(publicList.status).toBe(200);
    expect(publicList.data.guides[0].title).toBe("管理员审核攻略");
    expect(publicList.data.guides[0].content).toEqual(["第一段", "第二段"]);
  });

  it("普通用户不能审核投稿", async () => {
    const e = env();
    const authorCookie = await regToken(e, "普通作者");
    const otherCookie = await regToken(e, "普通审核者");
    const created = await statusOf(await handleSubmissions(authed("POST", "/api/submissions", authorCookie, { type: "guide", title: "待审核", content: "内容" }), new URL("http://localhost/api/submissions"), e));
    const response = await handleSubmissions(authed("POST", `/api/submissions/${created.data.submission.id}/approve`, otherCookie), new URL(`http://localhost/api/submissions/${created.data.submission.id}/approve`), e);
    expect(response.status).toBe(403);
  });

  it("美食审核后进入公开美食，撤回后同步移除", async () => {
    const e = env();
    const authorCookie = await regToken(e, "美食作者");
    const adminCookie = await regToken(e, "美食管理员");
    const adminUser = await handleAuth(new Request("http://localhost/api/auth/me", { headers: { Cookie: adminCookie } }), new URL("http://localhost/api/auth/me"), e);
    e.ADMIN_IDS = (await adminUser.json() as any).user.id;
    const created = await statusOf(await handleSubmissions(authed("POST", "/api/submissions", authorCookie, {
      type: "food", title: "测试小馆", destination: "成都", content: "推荐理由", extra: { city: "成都", address: "春熙路", type: "川菜", budget: 80 },
    }), new URL("http://localhost/api/submissions"), e));
    await handleSubmissions(authed("POST", `/api/submissions/${created.data.submission.id}/approve`, adminCookie), new URL(`http://localhost/api/submissions/${created.data.submission.id}/approve`), e);
    const publicFoods = await import("./submissions").then(({ handlePublicFoods }) => handlePublicFoods(new Request("http://localhost/api/food/public"), new URL("http://localhost/api/food/public"), e));
    expect((await publicFoods.json() as any).foods).toHaveLength(1);
    const deleted = await handleSubmissions(new Request(`http://localhost/api/submissions/${created.data.submission.id}`, { method: "DELETE", headers: { Cookie: authorCookie } }), new URL(`http://localhost/api/submissions/${created.data.submission.id}`), e);
    expect(deleted.status).toBe(200);
    const afterDelete = await import("./submissions").then(({ handlePublicFoods }) => handlePublicFoods(new Request("http://localhost/api/food/public"), new URL("http://localhost/api/food/public"), e));
    expect((await afterDelete.json() as any).foods).toHaveLength(0);
  });
});

async function handlePublic(request: Request, url: URL, testEnv: ReturnType<typeof env>) {
  const { handlePublicGuides } = await import("./submissions");
  return handlePublicGuides(request, url, testEnv);
}
