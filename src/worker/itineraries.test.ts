import { describe, it, expect } from "vitest";
import { handleItineraries } from "./itineraries";
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


const day = { day: 1, date: "2026-10-01", steps: [{ time: "09:00", type: "sightseeing", title: "宽窄巷子", description: "逛" }] };

describe("itineraries 行程保存", () => {
  it("无 token → 401", async () => {
    const req = new Request("http://localhost/api/itineraries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x", dayData: [day] }) });
    const { status } = await statusOf(await handleItineraries(req, env()));
    expect(status).toBe(401);
  });

  it("保存行程（201 + id）", async () => {
    const e = env();
    const atA = await regToken(e, "行程甲");
    const created = await statusOf(await handleItineraries(authed("POST", "/api/itineraries", atA, { title: "成都 3日", destination: "成都", days: 3, dayData: [day] }), e));
    expect(created.status).toBe(201);
    expect(created.data.itinerary.id).toMatch(/^itn_/);
    expect(created.data.itinerary.title).toBe("成都 3日");
  });

  it("缺 title/dayData → 400", async () => {
    const e = env();
    const atA = await regToken(e, "行程校验");
    const bad = await statusOf(await handleItineraries(authed("POST", "/api/itineraries", atA, { title: "x" }), e));
    expect(bad.status).toBe(400);
  });

  it("我的行程列表 + 隔离", async () => {
    const e = env();
    const atA = await regToken(e, "行程列表");
    const atB = await regToken(e, "行程隔离");
    await handleItineraries(authed("POST", "/api/itineraries", atA, { title: "重庆2日", dayData: [day] }), e);
    const list = await statusOf(await handleItineraries(authed("GET", "/api/itineraries", atA), e));
    expect(list.data.count).toBe(1);
    const b = await statusOf(await handleItineraries(authed("GET", "/api/itineraries", atB), e));
    expect(b.data.count).toBe(0);
  });
});
