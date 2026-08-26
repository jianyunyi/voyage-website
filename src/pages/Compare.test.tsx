// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Compare from "./Compare";
import { DEFAULT_HOTEL_IMAGE } from "../lib/hotel-images";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: null }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, fetchCompare: vi.fn() };
});

import { fetchCompare } from "../lib/api";

const mockedFetchCompare = vi.mocked(fetchCompare);

function renderCompare() {
  return render(
    <MemoryRouter>
      <Compare />
    </MemoryRouter>,
  );
}

describe("Compare hotel results", () => {
  beforeEach(() => {
    mockedFetchCompare.mockReset();
  });
  afterEach(() => cleanup());

  it("renders a hotel image and labels live results", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
        id: "hotel-live",
        platform: "RollingGo",
        price: "¥520/晚",
        priceValue: 520,
        name: "江景酒店",
        image: "https://example.com/hotel.jpg",
        features: ["含早餐"],
        source: "mcp",
      } as unknown as import("../lib/api").CompareItem]);

    renderCompare();

    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect(await screen.findByRole("img", { name: "江景酒店" })).toHaveAttribute(
      "src",
      "https://example.com/hotel.jpg",
    );
    expect(screen.getByText("实时数据")).toBeInTheDocument();
  });

  it("uses the shared fallback when a hotel has no image", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
        id: "hotel-fallback",
        platform: "携程旅行",
        price: "¥450/晚",
        priceValue: 450,
        name: "无图酒店",
        features: [],
        source: "fallback",
      } as unknown as import("../lib/api").CompareItem]);

    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect(await screen.findByRole("img", { name: "无图酒店" })).toHaveAttribute("src", DEFAULT_HOTEL_IMAGE);
    expect(screen.getByText("参考数据")).toBeInTheDocument();
  });

  it("switches a failed hotel image to the shared fallback", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
        id: "hotel-error",
        platform: "Booking.com",
        price: "¥480/晚",
        priceValue: 480,
        name: "图片失效酒店",
        image: "https://example.com/missing.jpg",
        features: [],
        source: "mcp",
      } as unknown as import("../lib/api").CompareItem]);

    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    const image = await screen.findByRole("img", { name: "图片失效酒店" });
    fireEvent.error(image);

    await waitFor(() => expect(image).toHaveAttribute("src", DEFAULT_HOTEL_IMAGE));
  });
});
