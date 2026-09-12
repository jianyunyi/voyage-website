# API_SPEC.md — 后端 / Worker 接口规范（草案）

说明：当前仓库前端实现依赖若干后端契约，以下为建议/草稿接口，用于后续实现聚合与 AI 代理。

通用错误格式
- HTTP 4xx/5xx
{
  "error": { "code": "INVALID_REQUEST", "message": "详细错误信息" }
}

认证
- 推荐使用 Bearer token（JWT）或 Cloudflare Worker 校验头。对于公开查询（比价）可允许匿名，但限制速率。

接口列表

1) GET /api/route?originId={id}&destId={id}
- 描述：返回多种路线方案（驾车/高铁/飞机）与估价
- 返回示例：
{
  "routes": [
    { "id": "r1", "type": "driving", "timeSec": 36000, "distanceMeters": 1200000, "tolls": 120, "taxi_estimate": 350 },
    { "id": "r2", "type": "train", "timeSec": 30600, "price": 680 }
  ]
}

2) POST /api/itinerary
- 描述：基于用户偏好与行程要求生成日程（可能调用 GenAI）
- 请求：{ "origin": "北京", "destinations": ["成都"], "dates": {"start":"2026-10-01","end":"2026-10-07"}, "preferences": {"budget":"moderate","travel_mode":"fastest"} }
- 返回：{ "itinerary": [{"day":1,"steps":[...]}], "sources": ["genai","local_cache"] }

3) GET /api/compare?category=hotel&destination=成都&checkIn=2026-10-01&checkOut=2026-10-07
- 描述：对接多平台并返回统一格式列表
- 返回示例：{ "items": [{"id":"hotel-1","platform":"ctrip","price":"¥450","url":"...","features":["含双早"]}] }

4) CRUD /api/user/favorites
- GET /api/user/favorites
- POST /api/user/favorites {favoriteItem}
- DELETE /api/user/favorites/:id
- 描述：将前端 FavoritesContext 持久化到服务器（可选）

5) GET /api/hotel/:id
- 描述：酒店详情与房型信息

速率限制与缓存
- 建议：公共比价接口 60 次/分钟，复杂聚合接口采用缓存（TTL 1-5 分钟，视数据新鲜度而定）

观察性
- 返回头：X-Request-Id, X-Backend-Server
- 错误日志应上报至 observability 后端

版本策略
- 使用 /api/v1/ 前缀进行版本控制（本草案默认 v1）

---
该规范为初稿，具体字段名/类型需与后端实现方确认并在代码中通过 TypeScript 接口类型化。