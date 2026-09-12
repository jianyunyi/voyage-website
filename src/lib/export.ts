/**
 * 行程导出工具：ICS 日历 + PDF（打印友好）
 */
import type { SavedItinerary } from "./api";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** HTML 实体转义（防 XSS——PDF 导出模板中的用户内容必须转义） */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 生成 ICS 日历文件内容（每天行程 → 全天事件） */
export function buildIcs(itinerary: SavedItinerary): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VoyageX//AI Itinerary//CN",
    "CALSCALE:GREGORIAN",
  ];
  for (const day of itinerary.dayData) {
    if (!day.date) continue;
    const date = day.date.replace(/-/g, "");
    const summary = `${itinerary.title} · 第${day.day}天`;
    const desc = day.steps.map(s => `${s.time} ${s.title}${s.description ? " - " + s.description : ""}`).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${itinerary.id}-${day.day}@voyagex`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** 下载文件（Blob） */
export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 导出 ICS */
export function exportIcs(itinerary: SavedItinerary): void {
  downloadBlob(buildIcs(itinerary), `${itinerary.title}.ics`, "text/calendar;charset=utf-8");
}

/** 导出 PDF（打印友好：打开打印窗口，用户选"另存为 PDF"） */
export function exportPdf(itinerary: SavedItinerary): void {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(itinerary.title)}</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1f2937; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  .day { margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
  .day h2 { font-size: 18px; color: #ea580c; margin-bottom: 8px; }
  .step { display: flex; gap: 12px; margin-bottom: 8px; }
  .time { color: #ea580c; font-weight: 600; min-width: 60px; }
  .title { font-weight: 500; }
  .desc { color: #6b7280; font-size: 13px; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <button class="no-print" onclick="window.print()" style="padding:8px 20px;background:#ea580c;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;margin-bottom:16px;">打印 / 另存为 PDF</button>
  <h1>${escapeHtml(itinerary.title)}</h1>
  <div class="meta">${escapeHtml(itinerary.destination || "")} · ${itinerary.days} 天 · ${escapeHtml(itinerary.budget || "")}</div>
  ${itinerary.dayData.map(d => `
  <div class="day">
    <h2>第 ${d.day} 天 · ${escapeHtml(d.date)}</h2>
    ${d.steps.map(s => `
    <div class="step">
      <div class="time">${escapeHtml(s.time)}</div>
      <div>
        <div class="title">${escapeHtml(s.title)}</div>
        ${s.description ? `<div class="desc">${escapeHtml(s.description)}</div>` : ""}
      </div>
    </div>`).join("")}
  </div>`).join("")}
</body></html>`);
  win.document.close();
}
