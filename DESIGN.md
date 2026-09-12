# DESIGN.md — VoyageX 代码级设计文档

## 概要
VoyageX：智能旅行助手，React + TypeScript 单页应用（Vite 构建），地图由高德（AMap）驱动，AI 能力依赖 Google GenAI/GEMINI_API_KEY，部署目标包含 Cloudflare Workers（wrangler）/可选 Express 后端。前端以懒加载路由、局部 context 管理状态，接口聚合第三方比价数据。

## 技术栈
- 前端：React 19, TypeScript, Vite, TailwindCSS, framer-motion, react-router-dom v7
- 地图/路线：@amap/amap-jsapi-loader, leaflet/react-leaflet（依赖存在但未显式使用在部分页面）
- AI：@google/genai（需 GEMINI_API_KEY）
- 部署：Cloudflare Workers（wrangler.jsonc + cloudflare vite 插件）；package.json 同时含 express（注意：需确认后端运行模式）

## 入口与路由
- index.html -> /src/main.tsx -> App.tsx
- App.tsx 使用 BrowserRouter 与懒加载，注册路由：
  - / -> Home
  - /guides -> Guides
  - /food -> Food
  - /planner -> MapPlanner
  - /compare -> Compare
  - /profile -> Profile
  - /hotel/:id -> HotelDetail

## 关键模块与职责映射
- src/main.tsx：React 挂载点
- src/App.tsx：路由与全局 Provider（FavoritesProvider）
- src/context/FavoritesContext.tsx：收藏管理（localStorage 持久化）
- src/pages/MapPlanner.tsx：地图与路线规划（AMapLoader、Driving 插件）
- src/pages/Compare.tsx：全网比价 UI（当前使用 mock 数据，需要接入后端聚合）
- src/pages/Home.tsx：首页 Hero、功能入口
- src/components/Layout.tsx（懒加载）：应用整体布局（header/footer/sidebar）

## 状态管理
- 轻量 context（FavoritesContext）+组件本地状态。
- 没有集中式状态管理库（Redux/MobX），适合当前规模，但跨页面缓存/离线或多端同步建议引入后端持久化或更完善状态层。

## 外部依赖与集成点
- 高德地图（AMap）——直接在 MapPlanner 中加载并使用驾车规划插件，存在硬编码 key 与 securityJsCode。
- Google GenAI（@google/genai）——用于 AI 行程/攻略生成，KEY 来自 process.env.GEMINI_API_KEY（vite define）。
- 第三方比价平台（未实现聚合后端）——Compare 页面目前使用 mock 数据。

## 已发现问题（需尽快修复）
- MapPlanner.tsx 内存在多次重复 city id（c5 重复），将导致选择/显示错误。
- 地图 API key 与安全码硬编码在源码，应移动到环境变量/机密管理。
- Compare.tsx 使用 mock 数据且在代码中内联了一个 Star SVG（fallback），需统一图标导入并移除冗余代码。
- Routes 文件夹存在空文件 src/routes/index.tsx（可清理或补充职责）。

## 建议的代码重构点（短期）
- 抽离 API 层：创建 src/lib/api.ts，集中处理所有后端请求与聚合逻辑，便于测试与替换实现。
- 配置管理：使用 .env 与 Vite 定义，移除源码中所有密钥，增强 runtime 检查。
- 移动收藏到后端（可选）：增加 /api/user/favorites，支持多端同步与授权。
- 类型完善：为 API 返回结构、路由 params 与外部 SDK 响应添加完整 TypeScript 接口。

## 测试/质量保障
- 加入类型检查（已有 tsc lint 脚本），增加单元测试（Jest/ vitest）与集成测试。

## 下一步（实现优先级）
1. 移除/替换硬编码密钥
2. 实现后端聚合 API（或 Worker）并替换 Compare 的 mock 数据
3. 修复 MapPlanner 中重复 ID 与地图异常情况
4. 统一错误处理与加载态

---
档案由代码扫描自动生成；如需更详细的方法级 mapping（函数定位、调用链），可继续请求并指定深度。