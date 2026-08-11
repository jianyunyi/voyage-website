# BACKLOG.md — 优先级任务与重构建议

高优先级
- 移除源码中硬编码密钥（MapPlanner.tsx 中的 AMap key 与 securityJsCode） -> 把密钥移动到环境变量并使用 secrets 管理（影响面：安全）
- 用后端/Worker 替换 Compare 页面 mock 数据 -> 实现 /api/compare 聚合器（影响面：功能可用性）
- 修复 MapPlanner 中重复 city id（c5 重复），并添加输入校验（影响面：bug 修复）
- 将 GenAI 调用迁移到后端代理以保护密钥（影响面：安全/合规）

中等优先级
- 抽离并实现 src/lib/api.ts：集中后端调用、错误处理、重试策略
- 实现用户持久化收藏（/api/user/favorites）并让 FavoritesContext 支持后端同步
- 增加单元测试（vitest/Jest）与类型测试，确保关键路径不回归
- 在 Worker 端增加缓存与速率限制（Cloudflare Cache + KV/ Durable Objects）

低优先级
- 性能优化：图片延迟加载、首屏减重、提前加载关键路由模块
- 无障碍与国际化（i18n）增强
- 离线体验与导出（将行程导出为 PDF/ICS）

代码级修复清单（建议修补点）
- src/pages/MapPlanner.tsx
  - 移除硬编码 API key，修复城市 id 重复，增加类型声明
- src/context/FavoritesContext.tsx
  - 添加可选后端同步逻辑并处理冲突策略
- src/pages/Compare.tsx
  - 移除内联 Star SVG，直接从 lucide-react 引入，替换 mockData 为 API 调用
- src/routes/index.tsx
  - 清理或补全路由中间件代码

可交付产物
- 新增 API 聚合 Worker（/workers/aggregator）
- 文档：DESIGN.md, ARCHITECTURE.md, API_SPEC.md（已生成）
- 迁移任务：密钥管理、CI/CD（wrangler deploy 脚本校验）、测试覆盖率报告

风险与备注
- 第三方平台反爬/反接入策略：聚合实现需要注意合规与接口稳定性
- 实时价格数据可能产生成本，建议先做缓存/抽样策略

---
如需我逐项生成 PR 补丁并运行本地构建/测试，请确认优先级，我会开始分支实现。