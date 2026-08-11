# ADR-0001: 收藏持久化从 localStorage 迁移到 Cloudflare KV

**Status**: accepted（已升级：多用户隔离）

## 决策
...（原决策内容保留）

## 升级记录（2026-08）
收藏从**单用户**升级为**多用户隔离**：
- KV key：`favorites` → `favorites:{userId}`
- 所有收藏端点要求 Bearer access token（401 未登录）
- 前端 FavoritesContext 从 AuthContext 获取 token 传入 API
- 配套新增投稿功能（POST/GET /api/submissions，同样按用户隔离）