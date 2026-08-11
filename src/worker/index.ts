/**
 * VoyageX Cloudflare Worker — API 聚合入口
 *
 * /api/compare   → 跨平台比价聚合
 * /api/health    → 健康检查
 * 其他请求       → 交给 ASSETS 绑定（静态资源 / SPA fallback）
 */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for API routes
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---- API Routes ----
    if (path === "/api/health") {
      return json({ status: "ok", service: "voyagex-aggregator", timestamp: Date.now() }, corsHeaders);
    }

    if (path === "/api/compare") {
      return handleCompare(request, url, corsHeaders);
    }

    // ---- Static Assets / SPA Fallback ----
    return env.ASSETS.fetch(request);
  },
};

function json(data: unknown, extraHeaders: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

async function handleCompare(request: Request, url: URL, corsHeaders: Record<string, string>): Promise<Response> {
  const category = url.searchParams.get("category") || "hotel";
  const destination = url.searchParams.get("destination") || "";
  const origin = url.searchParams.get("origin") || "";
  const checkIn = url.searchParams.get("checkIn") || "";
  const checkOut = url.searchParams.get("checkOut") || "";

  if (!["transport", "hotel", "car"].includes(category)) {
    return json({ error: { code: "INVALID_CATEGORY", message: "category must be transport|hotel|car" } }, corsHeaders, 400);
  }

  // 调用聚合器（当前为 mock，结构已就绪供真实 API 接入）
  const { aggregate } = await import("./aggregator");
  const items = await aggregate(category, { destination, origin, checkIn, checkOut });

  return json({ items, count: items.length, cached: false }, corsHeaders);
}
