/**
 * VoyageX Price Alerts API — 比价降价提醒
 *
 * 端点（均需登录）：
 *   POST /api/price-alerts            → 订阅比价项 {itemId, title, category, price}
 *   GET  /api/price-alerts            → 我的订阅列表
 *   POST /api/price-alerts/check      → 检查降价（模拟市场波动 ±8%）
 *
 * 存储：KV `priceAlerts:{userId}`（JSON 数组）
 * 说明：mock 价格静态，check 时按订阅价 ±8% 模拟市场波动，
 *       低于订阅价 → dropped=true + dropPercent（演示真实降价机制）
 */

interface AlertEnv {
  FAVORITES_KV: KVNamespace;  // 复用 KV（键前缀 priceAlerts:）
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

export interface PriceAlert {
  id: string;
  itemId: string;
  title: string;
  category: "transport" | "hotel" | "car";
  subscribedPrice: number;
  currentPrice: number;
  dropped: boolean;
  dropPercent?: number;
  createdAt: number;
}

const keyFor = (userId: string) => `priceAlerts:${userId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handlePriceAlerts(request: Request, url: URL, env: AlertEnv): Promise<Response> {
  const { resolveUser } = await import("./auth");
  const user = await resolveUser(request, env);
  if (!user) {
    return json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  }

  const method = request.method;
  const isCheck = url.pathname.endsWith("/check");

  // ---- POST /api/price-alerts/check（检查降价）----
  if (method === "POST" && isCheck) {
    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: PriceAlert[] = Array.isArray(raw) ? raw as PriceAlert[] : [];

    for (const alert of list) {
      // 模拟市场波动：±8% 随机
      const factor = 0.92 + Math.random() * 0.16;
      const newPrice = Math.round(alert.subscribedPrice * factor);
      alert.currentPrice = newPrice;
      if (newPrice < alert.subscribedPrice) {
        alert.dropped = true;
        alert.dropPercent = Math.round((1 - newPrice / alert.subscribedPrice) * 1000) / 10;
      }
    }
    await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(list));
    return json({ alerts: list, count: list.length, checkedAt: Date.now(), dataSource: "simulation", isLive: false }, 200);
  }

  // ---- POST /api/price-alerts（订阅）----
  if (method === "POST") {
    try {
      const body = await request.json() as Partial<PriceAlert>;
      if (!body.itemId || !body.title || typeof body.subscribedPrice !== "number") {
        return json({ error: { code: "INVALID_ALERT", message: "itemId/title/subscribedPrice are required" } }, 400);
      }

      const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
      const list: PriceAlert[] = Array.isArray(raw) ? raw as PriceAlert[] : [];

      // 幂等：同 itemId 不重复订阅
      if (list.some(a => a.itemId === body.itemId)) {
        return json({ alerts: list, count: list.length }, 200);
      }

      const alert: PriceAlert = {
        id: `pa_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        itemId: body.itemId,
        title: body.title.trim(),
        category: body.category || "hotel",
        subscribedPrice: body.subscribedPrice,
        currentPrice: body.subscribedPrice,
        dropped: false,
        createdAt: Date.now(),
      };

      list.unshift(alert);
      await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(list));
      return json({ alert, count: list.length }, 201);
    } catch {
      return json({ error: { code: "INVALID_JSON", message: "invalid JSON body" } }, 400);
    }
  }

  // ---- DELETE /api/price-alerts/:itemId（取消订阅）----
  if (method === "DELETE") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id) return json({ error: { code: "INVALID_ID", message: "item id required" } }, 400);

    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: PriceAlert[] = Array.isArray(raw) ? raw as PriceAlert[] : [];
    const next = list.filter(a => a.itemId !== id && a.id !== id);
    if (next.length === list.length) {
      return json({ error: { code: "NOT_FOUND", message: "订阅不存在" } }, 404);
    }
    await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(next));
    return json({ alerts: next, count: next.length }, 200);
  }

  // ---- GET /api/price-alerts（我的订阅）----
  if (method === "GET") {
    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: PriceAlert[] = Array.isArray(raw) ? raw as PriceAlert[] : [];
    return json({ alerts: list, count: list.length }, 200);
  }

  return json({ error: { code: "NOT_FOUND", message: "endpoint not found" } }, 404);
}
