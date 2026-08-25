import { describe, it, expect, vi } from "vitest";
import { handlePriceAlerts } from "./price-alerts";
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


function alertEnv() {
  return { FAVORITES_KV: new MemoryKV() as unknown as KVNamespace, AUTH_KV: new MemoryKV() as unknown as KVNamespace, JWT_SECRET: SECRET };
}

async function callAlert(method: string, path: string, token: string, e: ReturnType<typeof alertEnv>, body?: unknown) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  return statusOf(await handlePriceAlerts(req, new URL(`http://localhost${path}`), e));
}

describe("price-alerts 降价提醒", () => {
  it("无 token → 401", async () => {
    const req = new Request("http://localhost/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: "h1", title: "x", subscribedPrice: 100 }) });
    const { status } = await statusOf(await handlePriceAlerts(req, new URL("http://localhost/api/price-alerts"), alertEnv()));
    expect(status).toBe(401);
  });

  it("订阅（201）+ 幂等（同 itemId 不重复）", async () => {
    const e = alertEnv();
    const atA = await regToken(e, "降价甲");
    const created = await callAlert("POST", "/api/price-alerts", atA, e, { itemId: "h1", title: "市中心酒店", category: "hotel", subscribedPrice: 450 });
    expect(created.status).toBe(201);
    expect(created.data.alert.id).toMatch(/^pa_/);
    const dup = await callAlert("POST", "/api/price-alerts", atA, e, { itemId: "h1", title: "市中心酒店", subscribedPrice: 450 });
    expect(dup.data.count).toBe(1);
  });

  it("缺字段 → 400", async () => {
    const e = alertEnv();
    const atA = await regToken(e, "降价校验");
    const bad = await callAlert("POST", "/api/price-alerts", atA, e, { itemId: "h1" });
    expect(bad.status).toBe(400);
  });

  it("check 检测降价（mock Math.random 固定为低价）", async () => {
    const e = alertEnv();
    const atA = await regToken(e, "降价检测");
    await callAlert("POST", "/api/price-alerts", atA, e, { itemId: "h1", title: "酒店", subscribedPrice: 100 });
    // 固定 random → 0.9（波动 92%..108% 中的低价档）
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const checked = await callAlert("POST", "/api/price-alerts/check", atA, e);
    expect(checked.data.alerts[0].dropped).toBe(true);
    expect(checked.data.alerts[0].currentPrice).toBeLessThan(100);
    expect(checked.data.alerts[0].dropPercent).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it("列表 + 用户隔离", async () => {
    const e = alertEnv();
    const atA = await regToken(e, "降价列表");
    const atB = await regToken(e, "降价隔离");
    await callAlert("POST", "/api/price-alerts", atA, e, { itemId: "h1", title: "x", subscribedPrice: 100 });
    const list = await statusOf(await handlePriceAlerts(authed("GET", "/api/price-alerts", atA), new URL("http://localhost/api/price-alerts"), e));
    expect(list.data.count).toBe(1);
    const b = await statusOf(await handlePriceAlerts(authed("GET", "/api/price-alerts", atB), new URL("http://localhost/api/price-alerts"), e));
    expect(b.data.count).toBe(0);
  });
});
