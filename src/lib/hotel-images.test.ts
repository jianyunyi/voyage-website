import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOTEL_IMAGE,
  handleHotelImageError,
  resolveHotelImage,
} from "./hotel-images";

describe("resolveHotelImage", () => {
  it("prefers image over the first image in images", () => {
    expect(resolveHotelImage({
      image: "https://example.com/primary.jpg",
      images: ["https://example.com/secondary.jpg"],
    })).toBe("https://example.com/primary.jpg");
  });

  it("uses the first valid image when image is missing or invalid", () => {
    expect(resolveHotelImage({
      image: "javascript:alert(1)",
      images: ["https://example.com/secondary.jpg"],
    })).toBe("https://example.com/secondary.jpg");
  });

  it("falls back for empty or unsafe image values", () => {
    expect(resolveHotelImage({ image: "data:image/png;base64,abc", images: [] })).toBe(DEFAULT_HOTEL_IMAGE);
    expect(resolveHotelImage({ image: "//example.com/hotel.jpg" })).toBe(DEFAULT_HOTEL_IMAGE);
    expect(resolveHotelImage({})).toBe(DEFAULT_HOTEL_IMAGE);
  });
});

describe("handleHotelImageError", () => {
  it("replaces the failed image and removes its error handler", () => {
    const image = {
      src: "https://example.com/missing.jpg",
      onerror: () => undefined,
    } as unknown as HTMLImageElement;

    handleHotelImageError({ currentTarget: image } as unknown as Event);

    expect(image.src).toBe(DEFAULT_HOTEL_IMAGE);
    expect(image.onerror).toBeNull();
  });
});
