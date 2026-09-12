# ADR-0003: JWT access/refresh 认证 + 旋转 + 重用检测

**Status**: accepted

## 决策

登录认证采用 **JWT 双 token 方案**：
- accessToken：HS256 JWT，15 分钟短命，无服务端状态
- refreshToken：HS256 JWT + AUTH_KV 服务端状态，7 天
- **Refresh Token Rotation**：每次 refresh 换新 token，旧 token 立即作废
- **Reuse Detection**：已轮换的旧 refresh token 再次使用 = 盗用信号 → 撤销该用户整个 token 家族
- 密码 PBKDF2 哈希（100k 迭代）+ 随机 salt + 常量时间比较

## 背景

用户要求企业级登录方案（方案 A + JWT access/refresh + 旋转 + 重用检测防盗用）。

## 备选方案

1. **单一 JWT（无 refresh）**：简单但 access token 长命 = 泄露窗口大；短命 = 频繁重新登录。
2. **不透明 session token（服务端存储）**：可随时撤销但每次请求查存储，无状态性差。
3. **JWT access + refresh + rotation（选定）**：access 无状态快、refresh 有状态可撤销、旋转限制盗用窗口、重用检测主动发现攻击。

## 安全模型

```
攻击者盗用 rt1 → 使用一次 → 服务端旋转 rt1→rt2（rt1 作废）
攻击者重放旧 rt1 → 服务端发现 rotated=true → TOKEN_REUSED
                → 撤销整个 token 家族（用户所有会话失效）
受害者：收到 401 → 重新登录（盗用会话已被清除）
```

## 技术要点

- JWT 用 Web Crypto HMAC-SHA256 实现（零依赖，Worker 原生）
- KV key：`user:{id}` / `userByName:{nickname}` / `refresh:{jti}` / `userTokens:{userId}`（家族）
- JWT_SECRET 从 .dev.vars（本地）/ secrets（生产）注入
- access token 15 分钟 → 前端 AuthContext 启动时 fetchMe 校验，失效自动 refresh

## 后果

- 前端 localStorage 存 token（XSS 风险已知，SPA 演示可接受；生产建议 HttpOnly cookie + CSRF 防护）
- 单 KV 存储，多用户收藏需迁移：favorites key 从 `favorites` → `favorites:{userId}`
- 重用检测会误伤多设备并发 refresh（同一 refresh token 被两个设备同时使用）——生产需权衡