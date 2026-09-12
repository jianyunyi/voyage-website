# VoyageX 部署指南（Cloudflare Workers）

## 前置条件
- Cloudflare 账号 + 已登录 wrangler（`npx wrangler login`）
- Node 22+

## 1. 创建 KV Namespace（获取真实 UUID）
```bash
npx wrangler kv namespace create FAVORITES_KV
# 输出: { "binding": "FAVORITES_KV", "id": "<uuid-1>" }
npx wrangler kv namespace create AUTH_KV
# 输出: { "binding": "AUTH_KV", "id": "<uuid-2>" }
```

## 2. 更新 wrangler.jsonc
将两个占位 id（`voyagex-favorites` / `voyagex-auth`）替换为上面输出的真实 UUID。

## 3. 设置生产 Secrets（不要提交到 git）
```bash
npx wrangler secret put DEEPSEEK_API_KEY    # AI 行程生成（机器级 key）
npx wrangler secret put JWT_SECRET          # 认证签名密钥（建议 openssl rand -hex 32 生成）
npx wrangler secret put ROLLINGGO_API_KEY
```
> `.dev.vars` 仅用于本地开发（gitignored）。生产必须用 `wrangler secret put`。

高德 JS 地图密钥不是 Worker Secret，而是在前端构建时注入：生产构建前设置 `VITE_AMAP_KEY` 和可选的 `VITE_AMAP_SECURITY_CODE` 环境变量；Go 服务使用另一枚 Web Service Key。

RollingGo 酒店 MCP 地址为 `https://mcp.rollinggo.cn/mcp`。机票 MCP 当前下线维护，保持 `ROLLINGGO_FLIGHT_ENABLED=false`；服务恢复后再配置 `ROLLINGGO_FLIGHT_MCP_URL` 并开启。不要把 API Key 写入 `wrangler.jsonc`。

创建投稿图片 R2：
```bash
npx wrangler r2 bucket create voyagex-submission-images
npx wrangler r2 bucket create voyagex-submission-images-staging
```

接入 Go 路线服务时，生产和 staging 已配置 `ROUTE_BACKEND_URL=https://route-api.voyagex.us.ci`。Go 服务必须配置 `AMAP_WEB_SERVICE_KEY`，否则驾车方案仍会返回估算数据。测试环境使用：
```bash
npx wrangler secret put ROLLINGGO_API_KEY --env staging
npx wrangler secret put JWT_SECRET --env staging
npx wrangler secret put DEEPSEEK_API_KEY --env staging
npx wrangler deploy --env staging
```
`wrangler.jsonc` 已绑定独立的 staging KV 和 R2。`ROUTE_BACKEND_URL` 必须指向可从 Cloudflare Worker 访问的 Go 服务 HTTPS 地址；未配置时会安全降级为本地估算。高铁和飞机当前仍只返回估算方案，直到接入真实班次/票价供应商。

## 4. 构建 + 部署
```bash
npm run build          # Vite 静态产物 dist/
npx wrangler deploy
```

## 5. 验证
```bash
curl https://<your-worker>.workers.dev/api/health
# 打开首页 → 注册 → 生成行程（sources=deepseek 证明 key 生效）
```

## 6. CI 自动部署（可选）
在 `.github/workflows/ci.yml` 追加 deploy job：
```yaml
  deploy:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

## 回滚
```bash
npx wrangler deployments list   # 查看历史
npx wrangler rollback           # 回滚到上一个版本
```
