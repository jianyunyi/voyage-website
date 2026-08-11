import { describe, it, expect } from "vitest";
import { generateItinerary } from "./itinerary";

const baseReq = {
  origin: "北京",
  destinations: ["成都"],
  dates: { start: "2026-10-01", end: "2026-10-03" },
  preferences: { budget: "moderate" as const, travel_mode: "balanced" as const },
};

describe("generateItinerary", () => {
  it("生成的天数与日期区间匹配", async () => {
    const result = await generateItinerary(baseReq);
    expect(result.days).toHaveLength(3);
    expect(result.days[0].date).toBe("2026-10-01");
    expect(result.days[2].date).toBe("2026-10-03");
    expect(result.sources).toContain("mock_generator");
  });

  it("每天包含固定节奏的行程步骤", async () => {
    const result = await generateItinerary(baseReq);
    for (const day of result.days) {
      expect(day.steps.length).toBeGreaterThanOrEqual(3);
      const times = day.steps.map(s => s.time);
      expect(times).toContain("09:00");
      expect(times).toContain("19:00");
    }
  });

  it("目的地景点注入（成都 → 宽窄巷子等）", async () => {
    const result = await generateItinerary(baseReq);
    const allTitles = result.days.flatMap(d => d.steps.map(s => s.title)).join("");
    expect(allTitles).toContain("宽窄巷子");
    expect(allTitles).toContain("火锅"); // 成都美食
  });

  it("预算影响酒店选择", async () => {
    const luxury = await generateItinerary({ ...baseReq, preferences: { budget: "luxury" as const, travel_mode: "fastest" as const } });
    const budget = await generateItinerary({ ...baseReq, preferences: { budget: "budget" as const, travel_mode: "fastest" as const } });
    const luxuryTitles = luxury.days.flatMap(d => d.steps.map(s => s.title)).join("");
    const budgetTitles = budget.days.flatMap(d => d.steps.map(s => s.title)).join("");
    expect(luxuryTitles).toContain("五星级酒店");
    expect(budgetTitles).toContain("经济连锁酒店");
  });

  it("单日行程也正常（同一天开始结束）", async () => {
    const single = await generateItinerary({
      ...baseReq,
      dates: { start: "2026-10-01", end: "2026-10-01" },
    });
    expect(single.days).toHaveLength(1);
  });

  it("未知目的地回退到成都", async () => {
    const result = await generateItinerary({
      ...baseReq,
      destinations: ["火星"],
    });
    const allTitles = result.days.flatMap(d => d.steps.map(s => s.title)).join("");
    expect(allTitles).toContain("宽窄巷子");
  });
});
