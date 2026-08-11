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
npx wrangler secret put VITE_AMAP_KEY       # 高德地图 JS API key
npx wrangler secret put VITE_AMAP_SECURITY_CODE
```
> `.dev.vars` 仅用于本地开发（gitignored）。生产必须用 `wrangler secret put`。

## 4. 构建 + 部署
```bash
npm run build          # 产物 dist/client + dist/voyagex
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