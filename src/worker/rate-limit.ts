/**
 * VoyageX 简单限流（滑动窗口计数器）
 *
 * 用途：保护公共 API（比价）不被滥用。
 * 注意：Worker isolate 级内存，非全局；生产多 isolate 场景
 * 应换 Cloudflare Rate Limiting 或 KV 计数（见 ADR 预留）。
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

const windows = new Map<string, WindowEntry>();

/**
 * 检查并记录一次请求。超过限制返回 false。
 * @param key 限流键（通常为 client IP）
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口时长（毫秒）
 */
export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    windows.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/** 清理过期窗口 */
export function rateLimitSweep(): void {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now - entry.windowStart >= 60_000) windows.delete(key);
  }
}
