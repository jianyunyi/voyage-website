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
import { getSecurityHeaders } from "./security";
import { getRoutes } from "./routes";
import { buildRollingGoConfig } from "./rollinggo";
import { buildRouteBackendConfig, fetchRouteBackend } from "./route-backend";

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  FAVORITES_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  DEEPSEEK_API_KEY?: string; // 从 .dev.vars（本地）/ secrets（生产）注入
  JWT_SECRET?: string;        // 从 .dev.vars（本地）/ secrets（生产）注入
  ADMIN_IDS?: string;         // 管理员用户 ID（逗号分隔），用于投稿审核
  IMAGES_BUCKET?: R2Bucket;   // 可选：投稿图片 R2 存储
  ALLOWED_ORIGINS?: string;   // 生产前端域名，逗号分隔
  ROLLINGGO_API_KEY?: string;
  ROLLINGGO_HOTEL_MCP_URL?: string;
  ROLLINGGO_FLIGHT_MCP_URL?: string;
  ROLLINGGO_TIMEOUT_MS?: string;
  ROUTE_BACKEND_URL?: string;
  ROUTE_BACKEND_TIMEOUT_MS?: string;
}

// 每 N 次请求清理一次缓存/限流窗口（防泄漏）
let requestCount = 0;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const CORS_HEADERS = getSecurityHeaders(request.headers.get("Origin") || undefined, env.ALLOWED_ORIGINS);

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
      return handleCompare(url, requestId, CORS_HEADERS, env);
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
      return handleRoute(url, requestId, CORS_HEADERS, env);
    }

    if (path === "/api/guides/public") {
      const { handlePublicGuides } = await import("./submissions");
      return withSecurityHeaders(await handlePublicGuides(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "",
      }), CORS_HEADERS);
    }

    if (path === "/api/food/public") {
      const { handlePublicFoods } = await import("./submissions");
      return withSecurityHeaders(await handlePublicFoods(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "",
      }), CORS_HEADERS);
    }

    if (path.startsWith("/api/submissions/image/")) {
      const { handleSubmissionImage } = await import("./submissions");
      return withSecurityHeaders(await handleSubmissionImage(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "",
        IMAGES_BUCKET: env.IMAGES_BUCKET,
      }), CORS_HEADERS);
    }

    if (path === "/api/itinerary") {
      return handleItinerary(request, requestId, env, CORS_HEADERS);
    }

    if (path.startsWith("/api/auth/")) {
      if (!env.JWT_SECRET) return json({ error: { code: "CONFIG_ERROR", message: "JWT secret is not configured" } }, 500, CORS_HEADERS);
      const { handleAuth } = await import("./auth");
      return withSecurityHeaders(await handleAuth(request, url, {
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET,
      }), CORS_HEADERS);
    }

    if (path === "/api/user/favorites" || path.startsWith("/api/user/favorites/")) {
      if (!env.JWT_SECRET) return json({ error: { code: "CONFIG_ERROR", message: "JWT secret is not configured" } }, 500, CORS_HEADERS);
      const { handleFavorites } = await import("./favorites");
      return withSecurityHeaders(await handleFavorites(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET,
      }), CORS_HEADERS);
    }

    if (path === "/api/submissions" || path.startsWith("/api/submissions/")) {
      if (!env.JWT_SECRET) return json({ error: { code: "CONFIG_ERROR", message: "JWT secret is not configured" } }, 500, CORS_HEADERS);
      const { handleSubmissions } = await import("./submissions");
      return withSecurityHeaders(await handleSubmissions(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET,
        ADMIN_IDS: env.ADMIN_IDS,
        IMAGES_BUCKET: env.IMAGES_BUCKET,
      }), CORS_HEADERS);
    }

    if (path === "/api/errors") {
      const { handleErrors } = await import("./errors");
      return withSecurityHeaders(await handleErrors(request, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET || "",
      }), CORS_HEADERS);
    }

    if (path === "/api/likes" || path === "/api/likes/toggle") {
      if (!env.JWT_SECRET) return json({ error: { code: "CONFIG_ERROR", message: "JWT secret is not configured" } }, 500, CORS_HEADERS);
      const { handleLikes } = await import("./likes");
      return withSecurityHeaders(await handleLikes(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET,
      }), CORS_HEADERS);
    }

    if (path === "/api/price-alerts" || path === "/api/price-alerts/check" || path.startsWith("/api/price-alerts/")) {
      if (!env.JWT_SECRET) return json({ error: { code: "CONFIG_ERROR", message: "JWT secret is not configured" } }, 500, CORS_HEADERS);
      const { handlePriceAlerts } = await import("./price-alerts");
      return withSecurityHeaders(await handlePriceAlerts(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET,
      }), CORS_HEADERS);
    }

    if (path === "/api/itineraries" || path.startsWith("/api/itineraries/")) {
      if (!env.JWT_SECRET) return json({ error: { code: "CONFIG_ERROR", message: "JWT secret is not configured" } }, 500, CORS_HEADERS);
      const { handleItineraries } = await import("./itineraries");
      return withSecurityHeaders(await handleItineraries(request, url, {
        FAVORITES_KV: env.FAVORITES_KV,
        AUTH_KV: env.AUTH_KV,
        JWT_SECRET: env.JWT_SECRET,
      }), CORS_HEADERS);
    }

    // ---- Static Assets / SPA Fallback ----
    return withSecurityHeaders(await env.ASSETS.fetch(request), CORS_HEADERS);
  },
};

function withSecurityHeaders(response: Response, securityHeaders: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Methods");
  headers.delete("Access-Control-Allow-Headers");
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

// ============================================================
// /api/compare — 带缓存
// ============================================================
async function handleCompare(url: URL, requestId: string, corsHeaders: Record<string, string>, env: Env): Promise<Response> {
  const category = url.searchParams.get("category") || "hotel";
  const destination = url.searchParams.get("destination") || "";
  const origin = url.searchParams.get("origin") || "";
  const checkIn = url.searchParams.get("checkIn") || "";
  const checkOut = url.searchParams.get("checkOut") || "";

  if (!["transport", "hotel", "car"].includes(category)) {
    return json({ error: { code: "INVALID_CATEGORY", message: "category must be transport|hotel|car" } }, 400, { ...corsHeaders, "X-Request-Id": requestId });
  }

  // 缓存键包含日期和出发地，避免把不同查询的实时价格混在一起。
  const cacheKey = `compare:${category}:${destination}:${origin}:${checkIn}:${checkOut}`;
  const cached = cacheGet<{ items: unknown[]; count: number }>(cacheKey);
  if (cached) {
    return json({ ...cached, cached: true }, 200, { ...corsHeaders, "X-Request-Id": requestId });
  }

  const { aggregate } = await import("./aggregator");
  const items = await aggregate(category, { destination, origin, checkIn, checkOut }, {
    rollingGo: buildRollingGoConfig(env),
  });
  const isLive = items.length > 0 && items.every(item => item.source === "mcp");
  const dataSource = isLive ? "mcp" : "fallback";

  cacheSet(cacheKey, { items, count: items.length, dataSource, isLive }, 60_000);

  return json({ items, count: items.length, cached: false, dataSource, isLive }, 200, { ...corsHeaders, "X-Request-Id": requestId });
}

// ============================================================
// /api/route — 路线聚合（带缓存）
// ============================================================
async function handleRoute(url: URL, requestId: string, corsHeaders: Record<string, string>, env: Env): Promise<Response> {
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
    return json({ error: { code: "INVALID_ROUTE", message: "originId or originLngLat is required" } }, 400, { ...corsHeaders, "X-Request-Id": requestId });
  }
  if (!destId && !destPoint) {
    return json({ error: { code: "INVALID_ROUTE", message: "destId or destLngLat is required" } }, 400, { ...corsHeaders, "X-Request-Id": requestId });
  }

  const cacheKey = `route:${originId || originLngLat}:${destId || destLngLat}`;
  const cached = cacheGet<{ routes: unknown[]; count: number; dataSource: string; isLive: boolean }>(cacheKey);
  if (cached) {
    return json({ ...cached, cached: true }, 200, { ...corsHeaders, "X-Request-Id": requestId });
  }

  const routeQuery = { originId, destId, originPoint, destPoint };
  const backendConfig = buildRouteBackendConfig(env);
  if (backendConfig) {
    try {
      const live = await fetchRouteBackend(backendConfig, routeQuery);
      cacheSet(cacheKey, live, 120_000);
      return json({ ...live, cached: false }, 200, { ...corsHeaders, "X-Request-Id": requestId });
    } catch {
      // Fall back to the local estimator when the Go service is unavailable.
    }
  }

  const routes = await getRoutes({ origin: originId || "custom", dest: destId || "custom", originPoint, destPoint });

  const fallback = { routes, count: routes.length, dataSource: "estimate", isLive: false };
  cacheSet(cacheKey, fallback, 120_000);

  return json({ ...fallback, cached: false }, 200, { ...corsHeaders, "X-Request-Id": requestId });
}

// ============================================================
// /api/itinerary — 行程生成
// ============================================================
async function handleItinerary(request: Request, requestId: string, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: { code: "METHOD_NOT_ALLOWED", message: "POST required" } }, 405, { ...corsHeaders, "X-Request-Id": requestId });
  }

  try {
    const body = await request.json() as import("./itinerary").ItineraryRequest;
    // 缓存：同参数 10 分钟（DeepSeek 调用 ~1-3s，缓存命中秒回）
    const cacheKey = `itinerary:${JSON.stringify(body)}`;
    const cached = cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return json({ ...cached, cached: true }, 200, { ...corsHeaders, "X-Request-Id": requestId });
    }
    const { generateItinerary } = await import("./itinerary");
    const itinerary = await generateItinerary(body, env);
    cacheSet(cacheKey, itinerary, 600_000);
    return json(itinerary, 200, { ...corsHeaders, "X-Request-Id": requestId });
  } catch (e) {
    return json({ error: { code: "INVALID_ITINERARY", message: "invalid request body" } }, 400, { ...corsHeaders, "X-Request-Id": requestId });
  }
}
