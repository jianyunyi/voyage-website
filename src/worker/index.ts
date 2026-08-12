/**
 * VoyageX Cloudflare Worker — API 聚合入口
 *
 * /api/health           → 健康检查
 * /api/compare          → 跨平台比价聚合（带缓存 + 限流）
 * /api/hotel/:id        → 酒店详情
 * /api/route            → 多方案路线聚合
 * /api/itinerary        → AI 行程生成
 * /api/user/favorites   → 收藏持久化（KV）
 * 其他请求              → 交给 ASSETS 绑定（静态资源 / SPA fallback）
 */

import { cacheGet, cacheSet, cacheSweep } from "./cache";
import { rateLimit, rateLimitSweep } from "./rate-limit";

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  FAVORITES_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  DEEPSEEK_API_KEY?: string; // 从 .dev.vars（本地）/ secrets（生产）注入
  JWT_SECRET?: string;        // 从 .dev.vars（本地）/ secrets（生产）注入
  ADMIN_IDS?: string;         // 管理员用户 ID（逗号分隔），用于投稿审核
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 每 N 次请求清理一次缓存/限流窗口（防泄漏）
let requestCount = 0;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 生成请求追踪 ID（可观测性）
    const requestId = crypto.randomUUID().slice(0, 8);

    // 定时清理（每 500 次请求）
    requestCount++;
    if (requestCount % 500 === 0) {
      cacheSweep();
      rateLimitSweep();
    }

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 限流（公共 API 60 次/分钟/IP）
    const clientIp = request.headers.get("cf-connecting-ip") || "local";
    if (path.startsWith("/api/") && path !== "/api/health") {
      if (!rateLimit(clientIp, 60)) {
        return json({ error: { code: "RATE_LIMITED", message: "请求过于频繁，请稍后再试" } }, 429, { ...CORS_HEADERS, "X-Request-Id": requestId });
      }
    }

    // ---- API Routes ----
    if (path === "/api/health") {
      return json({ status: "ok", service: "voyagex-aggregator", timestamp: Date.now() }, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
    }

    if (path === "/api/compare") {
      return handleCompare(url, requestId);
    }

    if (path.startsWith("/api/hotel/")) {
      const id = decodeURIComponent(path.split("/").pop() || "");
      const { getHotelDetail } = await import("./hotels");
      const hotel = await getHotelDetail(id);
      if (!hotel) {
        return json({ error: { code: "HOTEL_NOT_FOUND", message: `hotel ${id} not found` } }, 404, { ...CORS_HEADERS, "X-Request-Id": requestId });
      }
      return json(hotel, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
    }

    if (path === "/api/route") {
      return handleRoute(url, requestId);
    }

    if (path === "/api/itinerary") {
      return handleItinerary(request, requestId, env);
    }

    if (path.startsWith("/api/auth/")) {
      const { handleAuth } = await import("./auth");
      return handleAuth(request, url, {
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    if (path === "/api/user/favorites" || path.startsWith("/api/user/favorites/")) {
      const { handleFavorites } = await import("./favorites");
      return handleFavorites(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    if (path === "/api/submissions" || path.startsWith("/api/submissions/")) {
      const { handleSubmissions } = await import("./submissions");
      return handleSubmissions(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    if (path === "/api/errors") {
      const { handleErrors } = await import("./errors");
      return handleErrors(request, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    if (path === "/api/likes" || path === "/api/likes/toggle") {
      const { handleLikes } = await import("./likes");
      return handleLikes(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    if (path === "/api/price-alerts" || path === "/api/price-alerts/check" || path.startsWith("/api/price-alerts/")) {
      const { handlePriceAlerts } = await import("./price-alerts");
      return handlePriceAlerts(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    if (path === "/api/itineraries" || path.startsWith("/api/itineraries/")) {
      const { handleItineraries } = await import("./itineraries");
      return handleItineraries(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "dev-secret-change-me",
      });
    }

    // ---- Static Assets / SPA Fallback ----
    return env.ASSETS.fetch(request);
  },
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

// ============================================================
// /api/compare — 带缓存
// ============================================================
async function handleCompare(url: URL, requestId: string): Promise<Response> {
  const category = url.searchParams.get("category") || "hotel";
  const destination = url.searchParams.get("destination") || "";
  const origin = url.searchParams.get("origin") || "";
  const checkIn = url.searchParams.get("checkIn") || "";
  const checkOut = url.searchParams.get("checkOut") || "";

  if (!["transport", "hotel", "car"].includes(category)) {
    return json({ error: { code: "INVALID_CATEGORY", message: "category must be transport|hotel|car" } }, 400, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }

  // 缓存键：category + destination（TTL 60s）
  const cacheKey = `compare:${category}:${destination}`;
  const cached = cacheGet<{ items: unknown[]; count: number }>(cacheKey);
  if (cached) {
    return json({ ...cached, cached: true }, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }

  const { aggregate } = await import("./aggregator");
  const items = await aggregate(category, { destination, origin, checkIn, checkOut });

  cacheSet(cacheKey, { items, count: items.length }, 60_000);

  return json({ items, count: items.length, cached: false }, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
}

// ============================================================
// /api/route — 路线聚合（带缓存）
// ============================================================
async function handleRoute(url: URL, requestId: string): Promise<Response> {
  const originId = url.searchParams.get("originId") || "";
  const destId = url.searchParams.get("destId") || "";
  // 用户搜索定位坐标（format: "lng,lat"）
  const originLngLat = url.searchParams.get("originLngLat") || "";
  const destLngLat = url.searchParams.get("destLngLat") || "";

  const parsePoint = (s: string, name: string) => {
    const parts = s.split(",").map(Number);
    if (parts.length === 2 && isFinite(parts[0]) && isFinite(parts[1])) {
      return { name, lng: parts[0], lat: parts[1] };
    }
    return undefined;
  };
  const originPoint = parsePoint(originLngLat, url.searchParams.get("originName") || originId);
  const destPoint = parsePoint(destLngLat, url.searchParams.get("destName") || destId);

  // 必须提供城市 ID 或坐标
  if (!originId && !originPoint) {
    return json({ error: { code: "INVALID_ROUTE", message: "originId or originLngLat is required" } }, 400, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }
  if (!destId && !destPoint) {
    return json({ error: { code: "INVALID_ROUTE", message: "destId or destLngLat is required" } }, 400, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }

  const cacheKey = `route:${originId || originLngLat}:${destId || destLngLat}`;
  const cached = cacheGet<{ routes: unknown[] }>(cacheKey);
  if (cached) {
    return json({ ...cached, cached: true }, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }

  const { getRoutes } = await import("./routes");
  const routes = await getRoutes({ origin: originId || "custom", dest: destId || "custom", originPoint, destPoint });

  cacheSet(cacheKey, { routes }, 120_000);

  return json({ routes, count: routes.length, cached: false }, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
}

// ============================================================
// /api/itinerary — 行程生成
// ============================================================
async function handleItinerary(request: Request, requestId: string, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: { code: "METHOD_NOT_ALLOWED", message: "POST required" } }, 405, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }

  try {
    const body = await request.json() as import("./itinerary").ItineraryRequest;
    // 缓存：同参数 10 分钟（DeepSeek 调用 ~1-3s，缓存命中秒回）
    const cacheKey = `itinerary:${JSON.stringify(body)}`;
    const cached = cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return json({ ...cached, cached: true }, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
    }
    const { generateItinerary } = await import("./itinerary");
    const itinerary = await generateItinerary(body, env);
    cacheSet(cacheKey, itinerary, 600_000);
    return json(itinerary, 200, { ...CORS_HEADERS, "X-Request-Id": requestId });
  } catch (e) {
    return json({ error: { code: "INVALID_ITINERARY", message: "invalid request body" } }, 400, { ...CORS_HEADERS, "X-Request-Id": requestId });
  }
}
