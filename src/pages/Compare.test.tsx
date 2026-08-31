// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Compare from "./Compare";
import { DEFAULT_HOTEL_IMAGE } from "../lib/hotel-images";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: null }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, fetchCompare: vi.fn(), subscribeAlertRemote: vi.fn() };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

import { fetchCompare, subscribeAlertRemote } from "../lib/api";

const mockedFetchCompare = vi.mocked(fetchCompare);
const mockedSubscribe = vi.mocked(subscribeAlertRemote);

function renderCompare(initialEntries = ["/compare"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Compare />
    </MemoryRouter>,
  );
}

describe("Compare hotel results", () => {
  beforeEach(() => {
    mockedFetchCompare.mockReset();
    mockedSubscribe.mockReset();
    navigateMock.mockReset();
  });
  afterEach(() => cleanup());

  it("shows an initial state before the first search", () => {
    renderCompare();
    expect(screen.getByText("开始探索价格")).toBeInTheDocument();
    expect(screen.queryByText("没有找到匹配结果")).not.toBeInTheDocument();
  });

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
     }]);

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
    expect(screen.getByText("估算/兜底数据")).toBeInTheDocument();
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

  it("marks hotel images as lazy and adds a readable gradient overlay", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
      id: "hotel-overlay", platform: "RollingGo", price: "¥520/晚", priceValue: 520,
      name: "夜景酒店", features: [], source: "mcp",
    } as unknown as import("../lib/api").CompareItem]);
    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    const image = await screen.findByRole("img", { name: "夜景酒店" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image.parentElement).toHaveClass("hotel-image-overlay");
  });

  it("shows skeletons while loading and a useful empty state", async () => {
    let resolveResults!: (items: import("../lib/api").CompareItem[]) => void;
    mockedFetchCompare.mockReturnValueOnce(new Promise(resolve => { resolveResults = resolve; }));
    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(screen.getByLabelText("加载比价结果")).toBeInTheDocument();
    resolveResults([]);
    expect(await screen.findByText("没有找到匹配结果")).toBeInTheDocument();
    expect(screen.getByText("调整目的地或日期后，再试一次搜索。")).toBeInTheDocument();
  });

  it("shows an error and retries the failed search", async () => {
    mockedFetchCompare.mockRejectedValueOnce(new Error("网络暂时不可用"));
    mockedFetchCompare.mockResolvedValueOnce([]);
    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("网络暂时不可用");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(mockedFetchCompare).toHaveBeenCalledTimes(2));
  });

  it("preserves share, subscribe, book, and search behavior", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
      id: "hotel-actions", platform: "携程旅行", price: "¥450/晚", priceValue: 450,
      name: "中心酒店", features: [], source: "fallback",
    } as unknown as import("../lib/api").CompareItem]);
    mockedSubscribe.mockResolvedValueOnce([{ itemId: "hotel-actions" } as import("../lib/api").PriceAlert]);
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByRole("img", { name: "中心酒店" })).toBeInTheDocument();
    expect(mockedFetchCompare).toHaveBeenCalledWith(expect.objectContaining({ category: "hotel", destination: "成都" }));
    fireEvent.click(screen.getByRole("button", { name: "分享比价" }));
    expect(await screen.findByText("已复制")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "订阅降价" }));
    await waitFor(() => expect(mockedSubscribe).toHaveBeenCalledWith(expect.objectContaining({ itemId: "hotel-actions", subscribedPrice: 450 }), null));
    fireEvent.click(screen.getByRole("button", { name: "去预订" }));
    expect(navigateMock).toHaveBeenCalledWith("/hotel/hotel-actions");
  });

  it("loads and books non-hotel category results", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
      id: "train-1", platform: "12306", price: "¥680", priceValue: 680,
      type: "高铁", time: "08:00 - 16:30", features: [], url: "https://12306.cn",
    }]);
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    renderCompare(["/compare?category=transport&destination=成都"]);
    expect(await screen.findByText("12306")).toBeInTheDocument();
    expect(mockedFetchCompare).toHaveBeenCalledWith(expect.objectContaining({ category: "transport" }));
    fireEvent.click(screen.getByRole("button", { name: "去预订" }));
    expect(openMock).toHaveBeenCalledWith("https://12306.cn", "_blank");
    openMock.mockRestore();
  });

  it("searches with a usable transport form when switching category", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
      id: "train-switch", platform: "12306", price: "¥680", priceValue: 680,
      type: "高铁", time: "08:00 - 16:30", features: [], source: "fallback",
    } as unknown as import("../lib/api").CompareItem]);
    renderCompare();

    fireEvent.click(screen.getByRole("tab", { name: "交通工具" }));

    expect(await screen.findByText("12306")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("城市/机场/车站")).toHaveValue("北京");
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
    expect(mockedFetchCompare).toHaveBeenCalledWith(expect.objectContaining({ category: "transport", origin: "北京", destination: "成都" }));
    expect(screen.getByText("估算/兜底数据")).toBeInTheDocument();
  });

  it("prefers publisher images before supplier images", async () => {
    mockedFetchCompare.mockResolvedValueOnce([{
      id: "hotel-publisher", platform: "RollingGo", price: "¥520/晚", priceValue: 520,
      name: "发布者酒店", image: "https://example.com/supplier.jpg",
      images: ["https://example.com/supplier-2.jpg"],
      publisherImage: "https://example.com/publisher.jpg", features: [], source: "mcp",
    } as unknown as import("../lib/api").CompareItem]);
    renderCompare();
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByRole("img", { name: "发布者酒店" })).toHaveAttribute("src", "https://example.com/publisher.jpg");
  });

  it("uses all shared URL values when auto-searching", async () => {
    mockedFetchCompare.mockResolvedValueOnce([]);
    renderCompare(["/compare?category=hotel&destination=上海&origin=杭州&checkIn=2026-11-02&checkOut=2026-11-05&adults=3"]);

    await waitFor(() => expect(mockedFetchCompare).toHaveBeenCalledWith({
      category: "hotel",
      destination: "上海",
      origin: "杭州",
      checkIn: "2026-11-02",
      checkOut: "2026-11-05",
    }));
  });

  it("maps car pickup and dropoff fields to the existing API contract", async () => {
    mockedFetchCompare.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    renderCompare();
    fireEvent.click(screen.getByRole("tab", { name: "租车服务" }));

    await waitFor(() => expect(mockedFetchCompare).toHaveBeenCalledWith(expect.objectContaining({ category: "car" })));

    fireEvent.change(screen.getByLabelText("取车地点"), { target: { value: "成都机场" } });
    fireEvent.change(screen.getByLabelText("还车地点"), { target: { value: "成都东站" } });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => expect(mockedFetchCompare).toHaveBeenLastCalledWith({
      category: "car",
      destination: "成都机场",
      origin: "成都东站",
      checkIn: "2026-10-01",
      checkOut: "2026-10-07",
    }));
  });
});
