# VoyageX Go Backend

独立核心业务服务，供 Cloudflare Worker 网关调用。

## 本地运行

```bash
go test ./...
go run ./cmd/server
```

启用高德实时驾车数据前，配置 Web 服务 API Key（不是前端 JS Key）：

```bash
set AMAP_WEB_SERVICE_KEY=your-amap-web-service-key
set PORT=8080
```

可选配置 `AMAP_WEB_SERVICE_ENDPOINT` 用于测试环境或代理地址。配置成功后，驾车方案会返回 `source: "amap"`，整体响应标记为 `dataSource: "mixed"`、`isLive: true`；高铁、飞机仍会明确标记为估算，直到对应供应商接入。

接口：

- `GET /healthz`
- `GET /api/v1/route?originId=c1&destId=c4`
- `GET /api/route?originId=c1&destId=c4`（兼容现有 Worker 契约）

当前已接入高德实时驾车 Provider；高铁、飞机、酒店和比价 Provider 需要各自的供应商 API 凭据与字段映射，未配置时不会伪装成实时数据。

## 生产域名

建议将 Go 服务通过反向代理发布为 `https://route-api.voyagex.us.ci`，外部监听 443，内部转发到 `127.0.0.1:8080`。Worker 已通过 `ROUTE_BACKEND_URL` 指向此地址。部署后先验证：

```bash
curl https://route-api.voyagex.us.ci/healthz
curl "https://route-api.voyagex.us.ci/api/route?originId=c1&destId=c4"
```
