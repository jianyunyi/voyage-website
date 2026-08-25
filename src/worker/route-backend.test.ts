import { describe, expect, it, vi } from "vitest";
import { fetchRouteBackend, type RouteBackendConfig } from "./route-backend";

const config: RouteBackendConfig = {
  baseUrl: "https://route.test",
  timeoutMs: 100,
};

describe("route backend adapter", () => {
  it("forwards city ids and coordinates and validates the response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      routes: [{ id: "driving", type: "driving", label: "驾车", source: "amap", timeSec: 120, timeLabel: "2分钟", score: 0.2 }],
      count: 1,
      dataSource: "mixed",
      isLive: true,
    }), { status: 200 }));

    const result = await fetchRouteBackend(config, {
      originId: "c1",
      destId: "c4",
      originPoint: { name: "北京", lng: 116.4, lat: 39.9 },
      destPoint: { name: "成都", lng: 104.0, lat: 30.5 },
    }, fetchImpl);

    expect(result.dataSource).toBe("mixed");
    expect(result.routes).toHaveLength(1);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("originId=c1");
    expect(String(fetchImpl.mock.calls[0][0])).toContain("originLngLat=116.4%2C39.9");
  });

  it("fails closed when the backend returns an invalid response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ routes: [] }), { status: 200 }));
    await expect(fetchRouteBackend(config, { originId: "c1", destId: "c4" }, fetchImpl)).rejects.toThrow("invalid route response");
  });

  it("rejects routes with an unknown source", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      routes: [{ id: "driving", type: "driving", label: "驾车", timeSec: 120, timeLabel: "2分钟", score: 0.2, source: "unknown" }],
      count: 1,
      dataSource: "mixed",
      isLive: true,
    }), { status: 200 }));
    await expect(fetchRouteBackend(config, { originId: "c1", destId: "c4" }, fetchImpl)).rejects.toThrow("invalid route response");
  });
});
