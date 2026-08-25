/**
 * VoyageX Aggregator — 跨平台比价聚合
 *
 * RollingGo 提供酒店和机票实时搜索；其他未接入供应商的类别继续使用 fallback 数据。
 */

export interface CompareItem {
  id: string;
  platform: string;
  price: string;
  priceValue: number;  // 标准化数值，用于排序
  type?: string;
  time?: string;
  name?: string;
  features: string[];
  url?: string;
  source: "mcp" | "fallback";
}

export interface SearchParams {
  destination: string;
  origin: string;
  checkIn: string;
  checkOut: string;
}

export interface AggregationConfig {
  rollingGo?: import("./rollinggo").RollingGoConfig;
}

// ---- Mock 数据（从 Compare.tsx 迁移，标准化为 CompareItem）----

const mockTransport: CompareItem[] = [
  { id: "t1", platform: "携程旅行", price: "¥850", priceValue: 850, type: "飞机", time: "10:00 - 13:00", features: ["退改无忧", "含20kg托运"], url: "https://flights.ctrip.com/", source: "fallback" },
  { id: "t2", platform: "飞猪旅行", price: "¥820", priceValue: 820, type: "飞机", time: "10:00 - 13:00", features: ["含20kg托运"], url: "https://fliggy.com/", source: "fallback" },
  { id: "t3", platform: "去哪儿", price: "¥835", priceValue: 835, type: "飞机", time: "10:00 - 13:00", features: ["退改无忧", "含20kg托运"], url: "https://flight.qunar.com/", source: "fallback" },
  { id: "t4", platform: "12306", price: "¥680", priceValue: 680, type: "高铁", time: "08:00 - 16:30", features: ["官方直营", "退改便捷"], url: "https://www.12306.cn/", source: "fallback" },
];

const mockHotel: CompareItem[] = [
  { id: "hotel-1", platform: "携程旅行", price: "¥450/晚", priceValue: 450, name: "市中心豪华酒店", features: ["含双早", "免费取消"], source: "fallback" },
  { id: "hotel-2", platform: "Booking.com", price: "¥480/晚", priceValue: 480, name: "市中心豪华酒店", features: ["含双早", "延迟退房"], source: "fallback" },
  { id: "hotel-3", platform: "Agoda", price: "¥430/晚", priceValue: 430, name: "市中心豪华酒店", features: ["不可取消"], source: "fallback" },
];

const mockCar: CompareItem[] = [
  { id: "c1", platform: "神州租车", price: "¥150/天", priceValue: 150, name: "经济型轿车", features: ["免押金", "上门送取"], url: "https://www.zuche.com/", source: "fallback" },
  { id: "c2", platform: "一嗨租车", price: "¥140/天", priceValue: 140, name: "经济型轿车", features: ["免押金"], url: "https://www.1hai.cn/", source: "fallback" },
  { id: "c3", platform: "携程租车", price: "¥145/天", priceValue: 145, name: "经济型轿车", features: ["免押金", "全险"], url: "https://car.ctrip.com/", source: "fallback" },
];

// ---- 聚合器主函数 ----

export async function aggregate(category: string, params: SearchParams, config: AggregationConfig = {}): Promise<CompareItem[]> {
  if (config.rollingGo && category === "hotel") {
    try {
      const { searchHotels } = await import("./rollinggo");
      const items = await searchHotels(config.rollingGo, params);
      if (items.length > 0) return sortItems(items);
    } catch {
      // Keep the product usable when an external provider is unavailable.
    }
  }
  if (config.rollingGo?.flightEnabled && category === "transport") {
    try {
      const { searchFlights } = await import("./rollinggo");
      const items = await searchFlights(config.rollingGo, params);
      if (items.length > 0) return sortItems(items);
    } catch {
      // Keep the product usable when an external provider is unavailable.
    }
  }

  // Fallback 数据只作为供应商不可用时的兜底，并明确标记来源。
  await simulateLatency(50);
  let items: CompareItem[];
  switch (category) {
    case "transport": items = mockTransport.map(toFallback); break;
    case "hotel":     items = mockHotel.map(toFallback); break;
    case "car":       items = mockCar.map(toFallback); break;
    default:          items = [];
  }

  // 标准化处理：按价格升序（全网最低排第一）
  items = sortItems(items);

  // 如果有目的地参数，注入到 name 中（模拟搜索结果个性化）
  if (params.destination && category === "hotel") {
    items = items.map(item => ({
      ...item,
      name: `[${params.destination}] ${item.name || ""}`.trim(),
    }));
  }

  return items;
}

function sortItems(items: CompareItem[]): CompareItem[] {
  return [...items].sort((a, b) => a.priceValue - b.priceValue);
}

function toFallback(item: CompareItem): CompareItem {
  return { ...item, source: "fallback" };
}

// ---- 工具函数 ----

function simulateLatency(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 未来真实聚合器结构（预留）：
 *
 * async function aggregateReal(category: string, params: SearchParams): Promise<CompareItem[]> {
 *   const adapters = platformAdapters[category]; // 各平台 API 适配器
 *   const results = await Promise.allSettled(
 *     adapters.map(adapter => adapter.fetch(params))
 *   );
 *   const items = results
 *     .filter((r): r is PromiseFulfilledResult<CompareItem[]> => r.status === "fulfilled")
 *     .flatMap(r => r.value);
 *   return items.sort((a, b) => a.priceValue - b.priceValue);
 * }
 */
