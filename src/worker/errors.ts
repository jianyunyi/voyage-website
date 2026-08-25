/**
 * VoyageX Errors API — 前端错误上报（Sentry-lite）
 *
 *   POST /api/errors  → {message, stack?, url?, type?}
 *   GET  /api/errors  → 最近错误列表（限 50 条）
 *
 * 存储：KV `errors:{ts}`（TTL 7 天）
 */

interface ErrorsEnv {
  FAVORITES_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleErrors(request: Request, env: ErrorsEnv): Promise<Response> {
  // POST：上报错误（无需登录——崩溃时可能无 token）
  if (request.method === "POST") {
    try {
      const body = await request.json() as { message?: string; stack?: string; url?: string; type?: string };
      const message = body.message || "unknown error";
      const ts = Date.now();
      const key = `errors:${ts}:${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
      await env.FAVORITES_KV.put(
        key,
        JSON.stringify({
          message: message.slice(0, 500),
          stack: body.stack?.slice(0, 2000) || null,
          url: body.url?.slice(0, 300) || null,
          type: body.type || "unknown",
          ts,
        }),
        { expirationTtl: 7 * 24 * 3600 },
      );
      return json({ ok: true }, 201);
    } catch {
      return json({ error: { code: "INVALID_JSON", message: "invalid JSON body" } }, 400);
    }
  }

  // GET：最近错误（限 50 条，按时间倒序——遍历 KV list）
  if (request.method === "GET") {
    const list = await env.FAVORITES_KV.list({ prefix: "errors:", limit: 50 });
    const errors = [];
    for (const k of list.keys) {
      const raw = await env.FAVORITES_KV.get(k.name);
      if (raw) {
        try { errors.push(JSON.parse(raw)); } catch { /* 跳过坏记录 */ }
      }
    }
    errors.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return json({ errors, count: errors.length }, 200);
  }

  return json({ error: { code: "NOT_FOUND", message: "endpoint not found" } }, 404);
}
