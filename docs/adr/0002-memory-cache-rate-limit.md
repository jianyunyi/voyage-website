# ADR-0002: 缓存与限流使用 Worker 内存级实现

**Status**: accepted

## 决策

聚合 API（/api/compare、/api/route）使用 **Worker isolate 内存级 TTL 缓存**（60-120s）；公共 API 使用 **内存级滑动窗口限流**（60 次/分钟/IP）。响应携带 `X-Request-Id` 支持追踪。

## 背景

API_SPEC 建议比价接口做缓存（TTL 1-5 分钟）与限流（60 次/分钟）。作为单 Worker 部署的 MVP，内存级实现最简单且零外部依赖。

## 备选方案

1. **Cloudflare Cache API / KV 缓存**：全局一致，但增加 KV 读写延迟与成本，且本地 dev 模拟复杂。
2. **Cloudflare Rate Limiting 原生服务**：全局限流但需要单独配置与配额。
3. **内存级（选定）**：Worker isolate 内 Map 实现，零依赖、延迟最低、dev 可测。

## 后果

- 内存级缓存/限流在**单 isolate** 下完全正确（当前 wrangler dev 与最小部署规模）。
- 多 isolate 生产部署时，每个 isolate 独立计数——缓存可能重复计算、限流阈值按 isolate 放大。
- 已预留升级路径：`cache.ts`/`rate-limit.ts` 模块化，未来可替换为 Cloudflare Cache API / Rate Limiting 服务（改 import 即可）。
- 每 500 次请求触发一次 `cacheSweep()`/`rateLimitSweep()` 防内存泄漏。