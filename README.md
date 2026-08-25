# VoyageX

旅行规划、路线推荐、AI 行程、比价和地道美食探索平台。

## 本地开发

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
npm run dev
```

`.dev.vars` 只用于本地 Worker，禁止提交。前端地图变量配置在 `.env.local`，同样禁止提交。

## 验证

```powershell
npm run lint
npm test -- --run
npm run build
```

## Cloudflare 部署

1. 登录 Wrangler：`npx wrangler login`
2. 配置生产密钥，不要写入 Git：

```powershell
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put ROLLINGGO_API_KEY
```

RollingGo 酒店搜索使用 MCP。机票 MCP 当前下线维护，因此 `ROLLINGGO_FLIGHT_ENABLED` 默认关闭；服务恢复后设置为 `true` 再启用。可选配置 `ROLLINGGO_HOTEL_MCP_URL`、`ROLLINGGO_FLIGHT_MCP_URL` 和 `ROLLINGGO_TIMEOUT_MS`，默认超时 5 秒。供应商不可用时接口会返回 `dataSource: "fallback"`，不会把兜底数据标记为实时。

3. 在 Cloudflare Worker Variables 中配置 `ALLOWED_ORIGINS`，只填写正式前端域名。
4. 确认 `FAVORITES_KV` 与 `AUTH_KV` 绑定到生产 namespace。
5. 执行 `npm run deploy`，并检查 `/api/health`、登录、路线和行程生成链路。

## 生产安全基线

- Access/Refresh Token 不应通过 URL 传输。
- 生产环境必须配置随机 `JWT_SECRET`，代码不会再回退到默认密钥。
- CORS 只允许 `ALLOWED_ORIGINS` 中的来源。
- API 响应统一包含安全响应头与请求追踪 ID。
- 暴露过的 API Key 必须先撤销，再生成新 Key。
