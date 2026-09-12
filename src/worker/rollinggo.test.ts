import { describe, expect, it, vi } from "vitest";
import {
  callRollingGoTool,
  normalizeFlights,
  normalizeHotels,
  type RollingGoConfig,
} from "./rollinggo";

const config: RollingGoConfig = {
  apiKey: "test-key",
  hotelEndpoint: "https://rollinggo.test/hotel",
  flightEndpoint: "https://rollinggo.test/flight",
  flightEnabled: true,
  timeoutMs: 100,
};

describe("RollingGo response mapping", () => {
  it("maps hotelInformationList into compare items", () => {
    const items = normalizeHotels({
      hotelInformationList: [{
        hotelId: 1090005,
        name: "杭州测试酒店",
        address: "西湖区",
        imageUrl: "https://img.test/hotel.jpg",
        price: { lowestPrice: 352, currency: "CNY" },
        hotelAmenities: ["免费 WiFi"],
        bookingUrl: "https://rollinggo.cn/book/1",
      }],
    });

    expect(items).toEqual([expect.objectContaining({
      id: "rollinggo-hotel-1090005",
      platform: "RollingGo",
      price: "¥352/晚",
      priceValue: 352,
      name: "杭州测试酒店",
      image: "https://img.test/hotel.jpg",
      images: ["https://img.test/hotel.jpg"],
      features: ["免费 WiFi"],
      url: "https://rollinggo.cn/book/1",
      source: "mcp",
    })]);
  });

  it("maps the first valid image and preserves valid image arrays", () => {
    const items = normalizeHotels({
      hotels: [{
        hotelId: "array-images",
        name: "图片数组酒店",
        price: 420,
        images: ["http://img.test/one.jpg", "javascript:alert(1)", "https://img.test/two.jpg"],
      }],
    });

    expect(items[0]).toEqual(expect.objectContaining({
      image: "http://img.test/one.jpg",
      images: ["http://img.test/one.jpg", "https://img.test/two.jpg"],
    }));
  });

  it("maps publisher images separately so callers can prefer them", () => {
    const items = normalizeHotels({
      hotels: [{
        hotelId: "publisher-images",
        name: "投稿酒店",
        price: 520,
        image: "https://img.test/supplier.jpg",
        publisherImage: "https://img.test/publisher.jpg",
        publisherImages: ["https://img.test/publisher-2.jpg", "javascript:bad"],
      }],
    });

    expect(items[0]).toEqual(expect.objectContaining({
      image: "https://img.test/supplier.jpg",
      publisherImage: "https://img.test/publisher.jpg",
      publisherImages: ["https://img.test/publisher.jpg", "https://img.test/publisher-2.jpg"],
    }));
  });

  it("keeps hotel results when image fields are missing or invalid", () => {
    const items = normalizeHotels({
      hotels: [
        { hotelId: "no-image", name: "无图酒店", price: 300 },
        { hotelId: "invalid-image", name: "无效图片酒店", price: 310, image: "data:image/png;base64,abc" },
      ],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).not.toHaveProperty("image");
    expect(items[0]).not.toHaveProperty("images");
    expect(items[1]).not.toHaveProperty("image");
    expect(items[1]).not.toHaveProperty("images");
  });

  it("maps flight results and ignores records without a valid price", () => {
    const items = normalizeFlights({
      flights: [
        { flightNo: "RG100", airlineName: "测试航空", price: 680, departureTime: "08:00", arrivalTime: "11:00" },
        { flightNo: "RG200", airlineName: "无效航空", price: "unknown" },
      ],
    });

    expect(items).toEqual([expect.objectContaining({
      id: "rollinggo-flight-RG100",
      platform: "RollingGo",
      price: "¥680",
      priceValue: 680,
      type: "飞机",
      time: "08:00 - 11:00",
      source: "mcp",
    })]);
  });
});

describe("RollingGo MCP client", () => {
  it("initializes a session and calls a tool with the session id", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { protocolVersion: "2025-03-26", capabilities: {}, serverInfo: { name: "rollinggo" } },
      }), { status: 200, headers: { "Mcp-Session-Id": "session-1" } }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        result: { structuredContent: { hotelInformationList: [] } },
      }), { status: 200 }));

    await callRollingGoTool(config, "hotel", "searchHotels", { place: "杭州", size: 1 }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const notificationRequest = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(new Headers(notificationRequest.headers).get("Mcp-Session-Id")).toBe("session-1");
    const secondRequest = fetchImpl.mock.calls[2][1] as RequestInit;
    expect(new Headers(secondRequest.headers).get("Mcp-Session-Id")).toBe("session-1");
    expect(JSON.parse(String(secondRequest.body))).toEqual(expect.objectContaining({
      method: "tools/call",
      params: { name: "searchHotels", arguments: { place: "杭州", size: 1 } },
    }));
  });
});
