import { describe, it, expect } from "vitest";
import { getRoutes } from "./routes";

describe("getRoutes", () => {
  it("北京→成都返回 4 种方案", async () => {
    const routes = await getRoutes({ origin: "c1", dest: "c4" });
    expect(routes).toHaveLength(4);
    const types = routes.map(r => r.type);
    expect(types).toContain("driving");
    expect(types).toContain("train");
    expect(types).toContain("flight");
  });

  it("驾车方案包含距离与耗时", async () => {
    const routes = await getRoutes({ origin: "c1", dest: "c4" });
    const driving = routes.find(r => r.type === "driving");
    expect(driving).toBeDefined();
    expect(driving!.timeSec).toBeGreaterThan(0);
    expect(driving!.distanceMeters).toBeGreaterThan(0);
    expect(driving!.source).toBe("estimate");
  });

  it("高铁价格合理且快于驾车", async () => {
    const routes = await getRoutes({ origin: "c1", dest: "c4" });
    const driving = routes.find(r => r.type === "driving")!;
    const train = routes.find(r => r.type === "train")!;
    expect(train.timeSec).toBeLessThan(driving.timeSec);
    expect(train.priceValue).toBeGreaterThan(0);
    expect(train.source).toBe("estimate");
  });

  it("飞机最快但价格最高", async () => {
    const routes = await getRoutes({ origin: "c1", dest: "c4" });
    const flight = routes.find(r => r.type === "flight")!;
    const train = routes.find(r => r.type === "train")!;
    expect(flight.timeSec).toBeLessThan(train.timeSec);
    expect(flight.priceValue).toBeGreaterThan(train.priceValue!);
  });

  it("相同城市返回空", async () => {
    const routes = await getRoutes({ origin: "c1", dest: "c1" });
    expect(routes).toEqual([]);
  });

  it("无效城市返回空", async () => {
    const routes = await getRoutes({ origin: "c1", dest: "c99" });
    expect(routes).toEqual([]);
  });

  it("距离估算可复现（同城市对一致）", async () => {
    const a = await getRoutes({ origin: "c2", dest: "c7" }); // 上海→厦门
    const b = await getRoutes({ origin: "c2", dest: "c7" });
    expect(a[0].distanceMeters).toBe(b[0].distanceMeters);
  });

  it("路线估算不应包含人为聚合延迟", async () => {
    const startedAt = performance.now();
    await getRoutes({ origin: "c1", dest: "c4" });
    expect(performance.now() - startedAt).toBeLessThan(150);
  });
});
