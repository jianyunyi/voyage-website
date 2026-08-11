/**
 * VoyageX Submissions API — 用户投稿（攻略/美食）
 *
 * 端点（均需登录）：
 *   POST /api/submissions   → 创建投稿 {type, title, content, ...}
 *   GET  /api/submissions   → 我的投稿列表
 *
 * 存储：KV `submissions:{userId}`（JSON 数组）
 * 状态：status = "pending"（待审核，文案承诺审核后展示）
 */

import type { resolveUser } from "./auth";

interface SubmissionEnv {
  FAVORITES_KV: KVNamespace;  // 复用 KV（键前缀 submissions:）
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

export interface Submission {
  id: string;
  type: "guide" | "food";
  title: string;
  destination?: string;
  content: string;
  extra?: Record<string, unknown>;
  status: "pending" | "approved";
  createdAt: number;
}

const keyFor = (userId: string) => `submissions:${userId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}

export async function handleSubmissions(request: Request, env: SubmissionEnv): Promise<Response> {
  // 鉴权
  const { resolveUser } = await import("./auth");
  const user = await resolveUser(request, env);
  if (!user) {
    return json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  }

  const method = request.method;

  // ---- POST /api/submissions（创建投稿）----
  if (method === "POST") {
    try {
      const body = await request.json() as Partial<Submission>;
      if (!body.type || !body.title || !body.content) {
        return json({ error: { code: "INVALID_SUBMISSION", message: "type/title/content are required" } }, 400);
      }
      if (body.type !== "guide" && body.type !== "food") {
        return json({ error: { code: "INVALID_TYPE", message: "type must be guide|food" } }, 400);
      }

      const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
      const list: Submission[] = Array.isArray(raw) ? raw as Submission[] : [];

      const submission: Submission = {
        id: `sub_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        type: body.type,
        title: body.title.trim(),
        destination: body.destination?.trim() || undefined,
        content: body.content.trim(),
        extra: body.extra || undefined,
        status: "pending",
        createdAt: Date.now(),
      };

      list.unshift(submission);
      await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(list));
      return json({ submission, count: list.length }, 201);
    } catch {
      return json({ error: { code: "INVALID_JSON", message: "invalid JSON body" } }, 400);
    }
  }

  // ---- GET /api/submissions（我的投稿）----
  if (method === "GET") {
    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: Submission[] = Array.isArray(raw) ? raw as Submission[] : [];
    return json({ submissions: list, count: list.length }, 200);
  }

  return json({ error: { code: "NOT_FOUND", message: "endpoint not found" } }, 404);
}
