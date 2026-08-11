# VoyageX

智能旅行助手——将旅行攻略、美食推荐、地图路线规划与全网比价聚合在一个前端应用中。

## Language

### 旅行规划

**Route**:
一条从出发地到目的地的完整出行方案，包含交通方式、耗时、距离和费用。
_Avoid_: 路径、path

**MapPlanner**:
基于高德地图 JSAPI 的路线规划页面，提供城市间驾车路线的实时计算与可视化。
_Avoid_: 地图组件、map widget

**Itinerary**:
基于用户偏好和日期生成的多日行程安排，可能由 AI 辅助生成。
_Avoid_: 行程表、schedule

### 比价聚合

**Compare**:
跨平台比价页面，聚合交通（航班/高铁）、酒店、租车三类商品的价格数据。
_Avoid_: 对比页、price comparison

**Aggregator**:
后端/Worker 职责，并发调用多个第三方平台接口，做数据清洗、去重和标准化后返回统一格式。
_Avoid_: 爬虫、scraper

**Platform**:
第三方票务/酒店/租车供应方（携程、Booking、Agoda、12306 等），是 Aggregator 的数据源。
_Avoid_: 渠道、channel

**Favorite**:
用户收藏的旅行商品（酒店/航班/路线），当前存储在 localStorage，计划迁移到后端持久化。
_Avoid_: 收藏夹、bookmark

### AI 能力

**Guide**:
AI 生成的旅行攻略摘要或问答内容，依赖 Google GenAI（Gemini）。
_Avoid_: 指南、manual

### 部署

**Worker**:
Cloudflare Workers 边缘运行时，承载静态资源分发和可选的 API 聚合逻辑。
_Avoid_: 服务端、backend