# ADR-0001: 收藏持久化从 localStorage 迁移到 Cloudflare KV

**Status**: accepted

## 决策

用户收藏（Favorite）从纯 localStorage 迁移为 **Cloudflare KV 持久化**：Worker 暴露 `/api/user/favorites` CRUD 端点，前端 FavoritesContext 在 localStorage 缓存之上叠加 KV 同步（启动时拉取、增删时异步推送）。

## 背景

最初收藏仅存 localStorage（单浏览器、易丢失、不可跨端）。Compare 聚合 API 落地后，Worker 基础设施已就绪，收藏持久化顺势接入。

## 备选方案

1. **保留纯 localStorage**：单用户演示够用，但刷新/换设备即丢，无法支撑真实产品。
2. **Express 后端 + SQLite/MySQL**：功能完整但需要独立服务进程，违背 edge-first 架构。
3. **Cloudflare KV**（选定）：与现有 Worker 同部署、无额外进程、读写简单，适合低频小体积数据。

## 后果

- 收藏跨设备/跨浏览器持久化（KV 全局一致）。
- KV 是最终一致存储：写后立即可读（KV 写入后约 1s 内全局可见），极端场景可能有短暂延迟。
- 单用户演示固定 key `favorites`；多用户需引入认证 + user 维度 key（预留注释已标注）。