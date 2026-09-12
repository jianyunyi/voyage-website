import { describe, it, expect } from "vitest";
import { getHotelDetail, HOTEL_DB } from "./hotels";

describe("getHotelDetail", () => {
  it("返回存在的酒店完整详情", async () => {
    const hotel = await getHotelDetail("hotel-1");
    expect(hotel).not.toBeNull();
    expect(hotel?.name).toBe("市中心豪华酒店");
    expect(hotel?.platform).toBe("携程旅行");
    expect(hotel?.rating).toBeGreaterThanOrEqual(4);
    expect(hotel?.rooms.length).toBeGreaterThan(0);
    expect(hotel?.reviews.length).toBeGreaterThan(0);
    expect(hotel?.amenities.length).toBeGreaterThan(0);
  });

  it("所有酒店都有房型且价格可排序", async () => {
    for (const id of Object.keys(HOTEL_DB)) {
      const hotel = await getHotelDetail(id);
      expect(hotel).not.toBeNull();
      expect(hotel!.rooms.length).toBeGreaterThan(0);
      // 房型价格应为数值且按展示字段存在
      for (const room of hotel!.rooms) {
        expect(typeof room.priceValue).toBe("number");
        expect(room.price).toMatch(/^¥/);
      }
    }
  });

  it("不存在返回 null", async () => {
    const hotel = await getHotelDetail("nonexistent");
    expect(hotel).toBeNull();
  });

  it("HOTEL_DB 至少 3 个酒店", async () => {
    expect(Object.keys(HOTEL_DB).length).toBeGreaterThanOrEqual(3);
  });
});
