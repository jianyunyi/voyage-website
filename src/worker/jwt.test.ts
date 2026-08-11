import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt, hashPassword, randomSalt, safeEqual } from "./jwt";

const SECRET = "test-jwt-secret";

describe("signJwt / verifyJwt", () => {
  it("签名后可验证且 payload 正确", async () => {
    const token = await signJwt({ sub: "u_1", type: "access", jti: "rt_x" }, SECRET, 3600);
    const payload = await verifyJwt(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("u_1");
    expect(payload!.type).toBe("access");
    expect(payload!.jti).toBe("rt_x");
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
  });

  it("错误密钥验证失败", async () => {
    const token = await signJwt({ sub: "u_1", type: "access", jti: "rt_x" }, SECRET, 3600);
    const payload = await verifyJwt(token, "wrong-secret");
    expect(payload).toBeNull();
  });

  it("过期 token 验证失败", async () => {
    const token = await signJwt({ sub: "u_1", type: "access", jti: "rt_x" }, SECRET, -10);
    const payload = await verifyJwt(token, SECRET);
    expect(payload).toBeNull();
  });

  it("篡改 payload 验证失败", async () => {
    const token = await signJwt({ sub: "u_1", type: "access", jti: "rt_x" }, SECRET, 3600);
    const parts = token.split(".");
    // 改 payload 段（u_1 → u_2）
    const forgedPayload = btoa(JSON.stringify({ sub: "u_2", type: "access", jti: "rt_x", iat: 1, exp: 9999999999 }));
    const forged = `${parts[0]}.${forgedPayload.replace(/=/g, "")}.${parts[2]}`;
    expect(await verifyJwt(forged, SECRET)).toBeNull();
  });

  it("畸形 token 返回 null", async () => {
    expect(await verifyJwt("not-a-jwt", SECRET)).toBeNull();
    expect(await verifyJwt("", SECRET)).toBeNull();
  });

  it("不同 jti 的 token 独立", async () => {
    const a = await signJwt({ sub: "u_1", type: "refresh", jti: "rt_a" }, SECRET, 3600);
    const b = await signJwt({ sub: "u_1", type: "refresh", jti: "rt_b" }, SECRET, 3600);
    expect(a).not.toBe(b);
  });
});

describe("hashPassword / safeEqual", () => {
  it("相同密码+盐 → 相同哈希；不同盐 → 不同哈希", async () => {
    const salt = randomSalt();
    const h1 = await hashPassword("password123", salt);
    const h2 = await hashPassword("password123", salt);
    const h3 = await hashPassword("password123", randomSalt());
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("safeEqual 常量时间比较", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });

  it("randomSalt 生成 32 位 hex", () => {
    expect(randomSalt()).toMatch(/^[0-9a-f]{32}$/);
  });
});
