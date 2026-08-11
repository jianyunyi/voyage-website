/**
 * VoyageX Likes API — 攻略/美食点赞
 *
 * 端点（需登录）：
 *   POST /api/likes/toggle  → 点赞/取消 {itemId, title?}
 *   GET  /api/likes?ids=a,b → 批量查询点赞数 + 当前用户已赞状态
 *
 * 存储：KV `likes:{itemId}` = { count, users: string[] }
 */

interface LikesEnv {
  FAVORITES_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

interface LikeState {
  count: number;
  users: string[];
}

const keyFor = (itemId: string) => `likes:${itemId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}

async function readState(env: LikesEnv, itemId: string): Promise<LikeState> {
  const raw = await env.FAVORITES_KV.get(keyFor(itemId), "json");
  if (raw && typeof raw === "object" && "count" in (raw as object)) return raw as LikeState;
  return { count: 0, users: [] };
}

export async function handleLikes(request: Request, url: URL, env: LikesEnv): Promise<Response> {
  const { resolveUser } = await import("./auth");
  const user = await resolveUser(request, env);
  if (!user) {
    return json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  }

  const method = request.method;

  // ---- POST /api/likes/toggle ----
  if (method === "POST" && url.pathname.endsWith("/toggle")) {
    try {
      const body = await request.json() as { itemId?: string };
      if (!body.itemId) return json({ error: { code: "INVALID_LIKE", message: "itemId required" } }, 400);

      const state = await readState(env, body.itemId);
      const idx = state.users.indexOf(user.id);
      if (idx >= 0) {
        state.users.splice(idx, 1);
        state.count = Math.max(0, state.count - 1);
      } else {
        state.users.push(user.id);
        state.count += 1;
      }
      await env.FAVORITES_KV.put(keyFor(body.itemId), JSON.stringify(state));
      return json({ itemId: body.itemId, count: state.count, liked: idx < 0 }, 200);
    } catch {
      return json({ error: { code: "INVALID_JSON", message: "invalid JSON body" } }, 400);
    }
  }

  // ---- GET /api/likes?ids=a,b ----
  if (method === "GET") {
    const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
    const result: Record<string, { count: number; liked: boolean }> = {};
    for (const id of ids) {
      const state = await readState(env, id);
      result[id] = { count: state.count, liked: state.users.includes(user.id) };
    }
    return json({ likes: result }, 200);
  }

  return json({ error: { code: "NOT_FOUND", message: "endpoint not found" } }, 404);
}
