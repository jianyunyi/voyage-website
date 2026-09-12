import { describe, expect, it } from "vitest";
import { getSecurityHeaders } from "./security";

describe("security headers", () => {
  it("allows only the configured application origin", () => {
    const headers = getSecurityHeaders("https://voyage.example", "https://voyage.example");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://voyage.example");
    expect(headers.Vary).toBe("Origin");

    const disallowed = getSecurityHeaders("https://attacker.example", "https://voyage.example");
    expect(disallowed["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("uses localhost only when explicitly configured for development", () => {
    const headers = getSecurityHeaders("http://localhost:3000", "http://localhost:3000");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
  });

  it("returns browser security headers", () => {
    const headers = getSecurityHeaders(undefined, "https://voyage.example");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("allows application images and uploaded avatar data URLs", () => {
    const policy = getSecurityHeaders(undefined, "https://voyage.example")["Content-Security-Policy"];
    expect(policy).toContain("img-src 'self' data: blob: https://images.unsplash.com");
  });

  it("allows Cloudflare Insights and the app inline bootstrap", () => {
    const policy = getSecurityHeaders(undefined, "https://voyage.example")["Content-Security-Policy"];
    expect(policy).toContain("script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com");
    expect(policy).toContain("connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com");
  });
});
