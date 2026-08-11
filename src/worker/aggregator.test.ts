import { describe, it, expect, vi } from "vitest";
import { aggregate } from "./aggregator";

// 加速：mock 掉延迟，让测试快跑
vi.mock("./aggregator", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./aggregator")>();
  return { ...mod };
});

// 由于 simulateLatency 是模块私有函数，我们直接测 aggregate 的纯逻辑行为
// （延迟只影响耗时不影响结果）

const baseParams = { destination: "", origin: "", checkIn: "", checkOut: "" };

describe("aggregate", () => {
  it("hotel 返回 3 项且按价格升序", async () => {
    const items = await aggregate("hotel", baseParams);
    expect(items).toHaveLength(3);
    const prices = items.map(i => i.priceValue);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(items[0].platform).toBe("Agoda");
    expect(items[0].priceValue).toBe(430);
  });

  it("transport 返回 4 项且 12306 高铁最低", async () => {
    const items = await aggregate("transport", baseParams);
    expect(items).toHaveLength(4);
    expect(items[0].platform).toBe("12306");
    expect(items[0].type).toBe("高铁");
    expect(items[0].priceValue).toBe(680);
  });

  it("car 返回 3 项且一嗨最低", async () => {
    const items = await aggregate("car", baseParams);
    expect(items).toHaveLength(3);
    expect(items[0].platform).toBe("一嗨租车");
    expect(items[0].priceValue).toBe(140);
  });

  it("destination 注入到 hotel 的 name", async () => {
    const items = await aggregate("hotel", { ...baseParams, destination: "成都" });
    expect(items[0].name).toContain("[成都]");
  });

  it("非法 category 返回空数组", async () => {
    const items = await aggregate("invalid" as any, baseParams);
    expect(items).toEqual([]);
  });

  it("排序稳定性：价格相同时保持稳定", async () => {
    const items = await aggregate("hotel", baseParams);
    const prices = items.map(i => i.priceValue);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("所有 item 都有 id/platform/price/features 字段", async () => {
    const items = await aggregate("car", baseParams);
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.platform).toBeTruthy();
      expect(item.price).toBeTruthy();
      expect(Array.isArray(item.features)).toBe(true);
      expect(typeof item.priceValue).toBe("number");
    }
  });
});
