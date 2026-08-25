/**
 * VoyageX Itineraries API — 保存 AI 生成的行程
 *
 * 端点（均需登录）：
 *   POST /api/itineraries  → 保存行程 {title, destination, days, ...}
 *   GET  /api/itineraries  → 我的行程列表
 *
 * 存储：KV `itineraries:{userId}`（JSON 数组）
 * 模式：与 submissions.ts 一致（复用 resolveUser 鉴权）
 */

interface ItineraryEnv {
  FAVORITES_KV: KVNamespace;  // 复用 KV（键前缀 itineraries:）
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

export interface SavedItinerary {
  id: string;
  title: string;
  destination?: string;
  days: number;
  startDate?: string;
  endDate?: string;
  budget?: string;
  dayData: Array<{
    day: number;
    date: string;
    steps: Array<{ time: string; type: string; title: string; description: string }>;
  }>;
  createdAt: number;
}

const keyFor = (userId: string) => `itineraries:${userId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleItineraries(request: Request, url: URL, env: ItineraryEnv): Promise<Response> {
  const { resolveUser } = await import("./auth");
  const user = await resolveUser(request, env);
  if (!user) {
    return json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  }

  const method = request.method;

  // ---- POST /api/itineraries（保存行程）----
  if (method === "POST") {
    try {
      const body = await request.json() as Partial<SavedItinerary>;
      if (!body.title || !Array.isArray(body.dayData) || body.dayData.length === 0) {
        return json({ error: { code: "INVALID_ITINERARY", message: "title/dayData are required" } }, 400);
      }

      const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
      const list: SavedItinerary[] = Array.isArray(raw) ? raw as SavedItinerary[] : [];

      const itinerary: SavedItinerary = {
        id: `itn_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        title: body.title.trim(),
        destination: body.destination?.trim() || undefined,
        days: body.days || body.dayData.length,
        startDate: body.startDate,
        endDate: body.endDate,
        budget: body.budget,
        dayData: body.dayData,
        createdAt: Date.now(),
      };

      list.unshift(itinerary);
      await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(list));
      return json({ itinerary, count: list.length }, 201);
    } catch {
      return json({ error: { code: "INVALID_JSON", message: "invalid JSON body" } }, 400);
    }
  }

  // ---- GET /api/itineraries（我的行程）----
  if (method === "GET") {
    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: SavedItinerary[] = Array.isArray(raw) ? raw as SavedItinerary[] : [];
    return json({ itineraries: list, count: list.length }, 200);
  }

  // ---- DELETE /api/itineraries/:id（删除行程）----
  if (method === "DELETE") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id) return json({ error: { code: "INVALID_ID", message: "itinerary id required" } }, 400);

    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: SavedItinerary[] = Array.isArray(raw) ? raw as SavedItinerary[] : [];
    const next = list.filter(it => it.id !== id);
    if (next.length === list.length) {
      return json({ error: { code: "NOT_FOUND", message: "行程不存在" } }, 404);
    }
    await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(next));
    return json({ itineraries: next, count: next.length }, 200);
  }

  return json({ error: { code: "NOT_FOUND", message: "endpoint not found" } }, 404);
}
