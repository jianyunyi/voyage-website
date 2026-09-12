export type SecurityHeaders = Record<string, string>;

export function getSecurityHeaders(origin?: string, allowedOrigins?: string): SecurityHeaders {
  const headers: SecurityHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com; img-src 'self' data: blob: https://images.unsplash.com",
    Vary: "Origin",
  };

  const allowed = (allowedOrigins || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
