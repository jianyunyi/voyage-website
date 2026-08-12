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


interface SubmissionEnv {
  FAVORITES_KV: KVNamespace;  // 复用 KV（键前缀 submissions:）
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  ADMIN_IDS?: string;
}

export interface Submission {
  id: string;
  type: "guide" | "food";
  title: string;
  destination?: string;
  content: string;
  extra?: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

const keyFor = (userId: string) => `submissions:${userId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}

export async function handleSubmissions(request: Request, url: URL, env: SubmissionEnv): Promise<Response> {
  // 鉴权
  const { resolveUser } = await import("./auth");
  const user = await resolveUser(request, env);
  if (!user) {
    return json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  }

  const method = request.method;
  const pathSeg = url.pathname.split("/").filter(Boolean).pop() || "";

  // ---- DELETE /api/submissions/:id（撤回投稿，仅作者）----
  if (method === "DELETE") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id) return json({ error: { code: "INVALID_ID", message: "submission id required" } }, 400);

    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: Submission[] = Array.isArray(raw) ? raw as Submission[] : [];
    const next = list.filter(s => s.id !== id);
    if (next.length === list.length) {
      return json({ error: { code: "NOT_FOUND", message: "投稿不存在" } }, 404);
    }
    await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(next));
    return json({ submissions: next, count: next.length }, 200);
  }

  // ---- POST /api/submissions/:id/approve|reject（审核，仅管理员）----
  if (method === "POST" && (pathSeg === "approve" || pathSeg === "reject")) {
    const id = url.pathname.split("/").filter(Boolean).slice(-2)[0];
    if (!id) return json({ error: { code: "INVALID_ID", message: "submission id required" } }, 400);

    // 管理员校验：ADMIN_IDS 逗号分隔（未配置时无管理员）
    const admins = (env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (admins.length === 0 || !admins.includes(user.id)) {
      return json({ error: { code: "FORBIDDEN", message: "仅管理员可审核" } }, 403);
    }

    const raw = await env.FAVORITES_KV.get(keyFor(user.id), "json");
    const list: Submission[] = Array.isArray(raw) ? raw as Submission[] : [];
    const target = list.find(s => s.id === id);
    if (!target) return json({ error: { code: "NOT_FOUND", message: "投稿不存在" } }, 404);

    const next = list.map(s => s.id === id ? { ...s, status: pathSeg } : s);
    await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(next));
    const updated = next.find(s => s.id === id);
    return json({ submission: updated, status: updated?.status }, 200);
  }

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
