import { describe, it, expect, beforeEach, vi } from "vitest";
import { cacheGet, cacheSet, cacheDelete, cacheSweep } from "./cache";
import { rateLimit, rateLimitSweep } from "./rate-limit";

describe("cache", () => {
  beforeEach(() => {
    cacheSweep();
  });

  it("set 后能 get", () => {
    cacheSet("k1", { a: 1 }, 10_000);
    expect(cacheGet("k1")).toEqual({ a: 1 });
  });

  it("未设置返回 null", () => {
    expect(cacheGet("missing")).toBeNull();
  });

  it("过期后返回 null", () => {
    vi.useFakeTimers();
    cacheSet("k2", "v", 100);
    expect(cacheGet("k2")).toBe("v");
    vi.advanceTimersByTime(101);
    expect(cacheGet("k2")).toBeNull();
    vi.useRealTimers();
  });

  it("delete 后不可见", () => {
    cacheSet("k3", "v", 10_000);
    cacheDelete("k3");
    expect(cacheGet("k3")).toBeNull();
  });

  it("不同类型值互不干扰", () => {
    cacheSet("num", 42, 10_000);
    cacheSet("str", "hello", 10_000);
    cacheSet("arr", [1, 2], 10_000);
    expect(cacheGet("num")).toBe(42);
    expect(cacheGet("str")).toBe("hello");
    expect(cacheGet("arr")).toEqual([1, 2]);
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    rateLimitSweep();
  });

  it("窗口内允许 limit 次，超出拒绝", () => {
    expect(rateLimit("ip-1", 3, 60_000)).toBe(true);
    expect(rateLimit("ip-1", 3, 60_000)).toBe(true);
    expect(rateLimit("ip-1", 3, 60_000)).toBe(true);
    expect(rateLimit("ip-1", 3, 60_000)).toBe(false); // 第 4 次拒绝
  });

  it("不同 key 独立计数", () => {
    expect(rateLimit("ip-a", 1, 60_000)).toBe(true);
    expect(rateLimit("ip-a", 1, 60_000)).toBe(false);
    expect(rateLimit("ip-b", 1, 60_000)).toBe(true); // 另一个 key 不受影响
  });

  it("窗口过期后重置", () => {
    vi.useFakeTimers();
    expect(rateLimit("ip-2", 1, 100)).toBe(true);
    expect(rateLimit("ip-2", 1, 100)).toBe(false);
    vi.advanceTimersByTime(101);
    expect(rateLimit("ip-2", 1, 100)).toBe(true); // 新窗口
    vi.useRealTimers();
  });
});
