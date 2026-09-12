import type { PlacePoint, RouteOption } from "./routes";

export interface RouteBackendConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface RouteBackendQuery {
  originId: string;
  destId: string;
  originPoint?: PlacePoint;
  destPoint?: PlacePoint;
}

export interface RouteBackendResponse {
  routes: RouteOption[];
  count: number;
  dataSource: string;
  isLive: boolean;
}

function isRouteOption(value: unknown): value is RouteOption {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<RouteOption>;
  return typeof route.id === "string"
    && typeof route.type === "string"
    && typeof route.label === "string"
    && typeof route.timeSec === "number"
    && typeof route.timeLabel === "string"
    && typeof route.score === "number"
    && (route.source === "amap" || route.source === "estimate");
}

export async function fetchRouteBackend(
  config: RouteBackendConfig,
  query: RouteBackendQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<RouteBackendResponse> {
  const url = new URL("/api/route", config.baseUrl);
  if (query.originId) url.searchParams.set("originId", query.originId);
  if (query.destId) url.searchParams.set("destId", query.destId);
  if (query.originPoint) {
    url.searchParams.set("originLngLat", `${query.originPoint.lng},${query.originPoint.lat}`);
    url.searchParams.set("originName", query.originPoint.name);
  }
  if (query.destPoint) {
    url.searchParams.set("destLngLat", `${query.destPoint.lng},${query.destPoint.lat}`);
    url.searchParams.set("destName", query.destPoint.name);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`route backend HTTP ${response.status}`);
    const data = await response.json() as Partial<RouteBackendResponse>;
    if (!Array.isArray(data.routes) || !data.routes.every(isRouteOption) || typeof data.dataSource !== "string" || typeof data.isLive !== "boolean") {
      throw new Error("invalid route response");
    }
    return {
      routes: data.routes,
      count: typeof data.count === "number" ? data.count : data.routes.length,
      dataSource: data.dataSource,
      isLive: data.isLive,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`route backend timeout after ${config.timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function buildRouteBackendConfig(env: {
  ROUTE_BACKEND_URL?: string;
  ROUTE_BACKEND_TIMEOUT_MS?: string;
}): RouteBackendConfig | undefined {
  if (!env.ROUTE_BACKEND_URL) return undefined;
  return {
    baseUrl: env.ROUTE_BACKEND_URL,
    timeoutMs: Math.max(500, Number(env.ROUTE_BACKEND_TIMEOUT_MS) || 5000),
  };
}
