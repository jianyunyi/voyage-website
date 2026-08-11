# ARCHITECTURE.md — 架构与数据流说明（VoyageX）

## 概览
VoyageX 是一个前端主导的单页应用（SPA），将用户交互、地图功能与 AI 能力集中在浏览器端，同时通过后端/Workers 聚合外部平台数据。部署面向边缘（Cloudflare Workers），或可选将部分逻辑放在独立 Express 服务中。

## 组件边界
- Frontend (SPA)
  - UI 层：React 组件（pages、components、Layout）
  - 状态层：FavoritesContext + 本地组件 state
  - Integration：AMap JSAPI（地图与驾车路线）、@google/genai（AI 生成功能）
- Backend / Edge
  - Aggregator Worker/API：调用第三方票务/酒店/租车平台，做数据清洗与合并
  - Auth 服务（可选）：管理用户登录、持久化收藏

## 数据流（用户搜索比价示例）
1. 用户在 Compare 页面发起搜索 -> 浏览器调用 /api/compare?category=hotel&destination=成都
2. Aggregator Worker 接收请求，按并发限制并发调用各平台接口（携程/Booking/Agoda/12306 等）
3. Worker 汇总、去重、标准化价格/时间字段，按策略排序，返回统一 JSON
4. 前端接收并渲染，用户可点击去第三方平台完成预订

## 地图与路线（MapPlanner）
- 前端直接调用高德 JSAPI（AMapLoader），在浏览器上执行路线规划（Driving 插件）并渲染地图视图。
- 后端辅助（可选）：提供到达时刻估算、实时价格或第三方交通比价数据（例如将长途客运、火车、航班数据合并）。

## AI 能力集成点
- @google/genai（Gemini）用于生成行程、攻略摘要或问答。API Key 通过 Vite 定义传入前端（需改进：不建议在前端直接暴露私钥，建议在 Worker/后端代理中调用以保护密钥）。

## 伸缩与性能
- 代码分割：App.tsx 使用懒加载 Routes，减少首屏包体积
- 缓存层：在 Worker 端建议使用 Cloudflare Cache +合理的缓存键，降低第三方调用成本
- 限流与重试：Aggregator 需实现并发限制与退避策略

## 部署流程（建议）
1. 本地构建：npm run build（Vite）
2. 部署前端静态资源到 Cloudflare Pages 或使用 wrangler publish 将 Worker 与静态 assets 一并部署
3. 将敏感密钥使用 Cloudflare Secrets 或环境变量管理

## 可观察性
- wrangler.jsonc 中已启用 observability；监控指标应覆盖 Worker 调用延迟、第三方错误率、前端关键路径加载时间

## 决策记录
- 使用 Cloudflare Worker（edge）提升响应速度并减少跨区域延迟（优先级高）
- 将 Gemeni/GenAI 调用迁移到后端以避免前端密钥泄露（安全性）

---
如需生成 UML/架构图 SVG/PNG，可以把该文档作为源并请求导出。