import type { CompareItem, SearchParams } from "./aggregator";

export interface RollingGoConfig {
  apiKey: string;
  hotelEndpoint: string;
  flightEndpoint: string;
  flightEnabled: boolean;
  timeoutMs: number;
}

interface JsonRpcResponse {
  error?: { code?: number; message?: string };
  result?: {
    structuredContent?: unknown;
    content?: Array<{ type?: string; text?: string }>;
  };
}

type FetchLike = typeof fetch;

export async function callRollingGoTool(
  config: RollingGoConfig,
  service: "hotel" | "flight",
  toolName: string,
  argumentsValue: Record<string, unknown>,
  fetchImpl: FetchLike = fetch,
): Promise<unknown> {
  const endpoint = service === "hotel" ? config.hotelEndpoint : config.flightEndpoint;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  const sessionId = await initialize(config, endpoint, headers, fetchImpl);
  const { payload: response } = await postJsonRpc(config, endpoint, headers, {
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: argumentsValue },
    id: 2,
  }, sessionId, fetchImpl);

  if (response.error) {
    throw new Error(response.error.message || `RollingGo tool failed (${response.error.code ?? "unknown"})`);
  }
  return extractResult(response.result);
}

async function initialize(
  config: RollingGoConfig,
  endpoint: string,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<string | undefined> {
  const { payload: response, sessionId } = await postJsonRpc(config, endpoint, headers, {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "voyagex", version: "1.0.0" },
    },
    id: 1,
  }, undefined, fetchImpl);
  if (response.error) {
    throw new Error(response.error.message || "RollingGo MCP initialize failed");
  }
  await postNotification(config, endpoint, headers, "notifications/initialized", sessionId, fetchImpl);
  return sessionId;
}

async function postNotification(
  config: RollingGoConfig,
  endpoint: string,
  headers: Record<string, string>,
  method: string,
  sessionId: string | undefined,
  fetchImpl: FetchLike,
): Promise<void> {
  const requestHeaders = new Headers(headers);
  if (sessionId) requestHeaders.set("Mcp-Session-Id", sessionId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", method }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RollingGo MCP notification HTTP ${response.status}`);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`RollingGo MCP timeout after ${config.timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function postJsonRpc(
  config: RollingGoConfig,
  endpoint: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  sessionId: string | undefined,
  fetchImpl: FetchLike,
): Promise<{ payload: JsonRpcResponse; sessionId?: string }> {
  const requestHeaders = new Headers(headers);
  if (sessionId) requestHeaders.set("Mcp-Session-Id", sessionId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RollingGo MCP HTTP ${response.status}`);
    const payload = parseRpcPayload(await response.text());
    const responseSessionId = response.headers.get("Mcp-Session-Id") || sessionId;
    return { payload, sessionId: responseSessionId || undefined };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`RollingGo MCP timeout after ${config.timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseRpcPayload(text: string): JsonRpcResponse {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("RollingGo MCP returned an empty response");
  try {
    return JSON.parse(trimmed) as JsonRpcResponse;
  } catch {
    const dataLine = trimmed.split(/\r?\n/).find(line => line.startsWith("data:"));
    if (!dataLine) throw new Error("RollingGo MCP returned invalid JSON/SSE");
    return JSON.parse(dataLine.slice(5).trim()) as JsonRpcResponse;
  }
}

function extractResult(result: JsonRpcResponse["result"]): unknown {
  if (!result) throw new Error("RollingGo MCP returned no result");
  if (result.structuredContent !== undefined) return result.structuredContent;
  for (const content of result.content || []) {
    if (content.type !== "text" || !content.text) continue;
    try {
      return JSON.parse(content.text);
    } catch {
      continue;
    }
  }
  throw new Error("RollingGo MCP result has no JSON content");
}

export function buildRollingGoConfig(env: {
  ROLLINGGO_API_KEY?: string;
  ROLLINGGO_HOTEL_MCP_URL?: string;
  ROLLINGGO_FLIGHT_MCP_URL?: string;
  ROLLINGGO_FLIGHT_ENABLED?: string;
  ROLLINGGO_TIMEOUT_MS?: string;
}): RollingGoConfig | undefined {
  if (!env.ROLLINGGO_API_KEY) return undefined;
  return {
    apiKey: env.ROLLINGGO_API_KEY,
    hotelEndpoint: env.ROLLINGGO_HOTEL_MCP_URL || "https://mcp.rollinggo.cn/mcp",
    flightEndpoint: env.ROLLINGGO_FLIGHT_MCP_URL || "https://mcp.rollinggo.cn/mcp/flight",
    flightEnabled: env.ROLLINGGO_FLIGHT_ENABLED === "true",
    timeoutMs: Math.max(500, Number(env.ROLLINGGO_TIMEOUT_MS) || 5000),
  };
}

export async function searchHotels(config: RollingGoConfig, params: SearchParams): Promise<CompareItem[]> {
  const raw = await callRollingGoTool(config, "hotel", "searchHotels", {
    originQuery: params.destination,
    place: params.destination,
    placeType: "城市",
    ...(params.checkIn ? { checkInParam: { checkInDate: params.checkIn, stayNights: nightsBetween(params.checkIn, params.checkOut) } } : {}),
    size: 10,
  });
  return normalizeHotels(raw);
}

export async function searchFlights(config: RollingGoConfig, params: SearchParams): Promise<CompareItem[]> {
  const raw = await callRollingGoTool(config, "flight", "searchFlights", {
    adultNumber: 1,
    childNumber: 0,
    cabinGrade: "ECONOMY",
    fromCity: params.origin,
    toCity: params.destination,
    fromDate: params.checkIn,
    tripType: "ONE_WAY",
  });
  return normalizeFlights(raw);
}

export function normalizeHotels(raw: unknown): CompareItem[] {
  const list = arrayAt(raw, "hotelInformationList") || arrayAt(raw, "hotels");
  if (!list) throw new Error("RollingGo hotel response missing hotel list");
  return list.flatMap((value, index) => {
    if (!isRecord(value)) return [];
    const price = numberAt(value.price, "lowestPrice") ?? numberValue(value.price);
    const id = stringValue(value.hotelId) || stringValue(value.id);
    const name = stringValue(value.name);
    if (!id || !name || price === undefined || price < 0) return [];
    const features = stringArray(value.hotelAmenities).concat(stringArray(value.tags));
    const images = imageArray(value.image)
      .concat(imageArray(value.imageUrl), imageArray(value.coverImage), imageArray(value.images));
    const validImages = [...new Set(images)];
    return [{
      id: `rollinggo-hotel-${id || index}`,
      platform: "RollingGo",
      price: `¥${price}/晚`,
      priceValue: price,
      name,
      features: [...new Set(features)],
      url: stringValue(value.bookingUrl),
      ...(validImages.length > 0 ? { image: validImages[0], images: validImages } : {}),
      source: "mcp" as const,
    }];
  });
}

export function normalizeFlights(raw: unknown): CompareItem[] {
  const list = arrayAt(raw, "flights") || arrayAt(raw, "flightInformationList");
  if (!list) throw new Error("RollingGo flight response missing flight list");
  return list.flatMap((value, index) => {
    if (!isRecord(value)) return [];
    const flightNo = stringValue(value.flightNo) || stringValue(value.flightNumber) || `unknown-${index}`;
    const price = numberValue(value.price) ?? numberAt(value.price, "amount") ?? numberAt(value.price, "lowestPrice");
    if (price === undefined || price < 0) return [];
    const departure = stringValue(value.departureTime) || stringValue(value.departTime);
    const arrival = stringValue(value.arrivalTime) || stringValue(value.arriveTime);
    return [{
      id: `rollinggo-flight-${flightNo}`,
      platform: "RollingGo",
      price: `¥${price}`,
      priceValue: price,
      type: "飞机",
      time: departure && arrival ? `${departure} - ${arrival}` : undefined,
      name: stringValue(value.airlineName) || stringValue(value.airline),
      features: stringArray(value.features),
      url: stringValue(value.bookingUrl),
      source: "mcp" as const,
    }];
  });
}

function arrayAt(value: unknown, key: string): unknown[] | undefined {
  if (!isRecord(value) || !Array.isArray(value[key])) return undefined;
  return value[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function numberAt(value: unknown, key: string): number | undefined {
  return isRecord(value) ? numberValue(value[key]) : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
}

function imageArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(isHttpUrl);
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkOut) return 1;
  const days = Math.ceil((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
  return Number.isFinite(days) && days > 0 ? days : 1;
}
