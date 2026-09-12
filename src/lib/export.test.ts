import { describe, it, expect } from "vitest";
import { buildIcs } from "./export";
import type { SavedItinerary } from "./api";

const sample: SavedItinerary = {
  id: "itn_test123",
  title: "成都 3日行程",
  destination: "成都",
  days: 1,
  dayData: [
    { day: 1, date: "2026-10-01", steps: [{ time: "09:00", type: "sightseeing", title: "宽窄巷子", description: "逛老成都" }] },
  ],
  createdAt: 1750000000000,
};

describe("buildIcs", () => {
  it("生成标准 ICS 结构", () => {
    const ics = buildIcs(sample);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
  });

  it("日期格式化为 YYYYMMDD", () => {
    const ics = buildIcs(sample);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261001");
  });

  it("无日期天跳过（不生成事件）", () => {
    const noDate: SavedItinerary = { ...sample, dayData: [{ day: 1, date: "", steps: [] }] };
    const ics = buildIcs(noDate);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("特殊字符转义（逗号/分号）", () => {
    const withComma: SavedItinerary = { ...sample, title: "成都,重庆;双城记" };
    const ics = buildIcs(withComma);
    expect(ics).toContain("成都\\,重庆\\;双城记");
  });
});
