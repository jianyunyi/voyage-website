/**
 * VoyageX 轻量内存缓存（TTL）
 *
 * 用途：聚合 API 结果缓存，降低重复计算和第三方调用成本。
 * 注意：Worker isolate 级内存，非全局一致；生产多 isolate 场景
 * 应换 Cloudflare Cache API 或 KV 缓存（见 ADR 预留）。
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

/** 清理过期条目（简单防泄漏） */
export function cacheSweep(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}
