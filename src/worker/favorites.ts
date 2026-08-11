/**
 * VoyageX Favorites API — 用户收藏持久化（Cloudflare KV）
 *
 * 端点：
 *   GET    /api/user/favorites        → 列出全部收藏
 *   POST   /api/user/favorites        → 新增收藏 {id, type, title, ...}
 *   DELETE /api/user/favorites/:id    → 删除收藏
 *
 * 存储：KV namespace `FAVORITES_KV`
 *   key: favorites   value: FavoriteItem[] (JSON)
 *
 * 注意：单用户演示场景，固定 user 为 "demo"。
 * 多用户场景需引入 auth + user 维度 key（见 ADR）。
 */

export interface FavoriteItem {
  id: string;
  type: "guide" | "food" | "hotel" | "route";
  title: string;
  subtitle?: string;
  image?: string;
  rating?: number;
  price?: string;
  addedAt?: number;
}

interface Env {
  FAVORITES_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
}

const keyFor = (userId: string) => `favorites:${userId}`;

async function readAll(env: Env, userId: string): Promise<FavoriteItem[]> {
  const raw = await env.FAVORITES_KV.get(keyFor(userId), "json");
  return Array.isArray(raw) ? raw : [];
}

async function writeAll(env: Env, userId: string, items: FavoriteItem[]): Promise<void> {
  await env.FAVORITES_KV.put(keyFor(userId), JSON.stringify(items));
}

export async function handleFavorites(request: Request, url: URL, env: Env): Promise<Response> {
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean); // ["api","user","favorites","<id>"]

  // 鉴权：需要有效 access token
  const { resolveUser } = await import("./auth");
  const user = await resolveUser(request, env);
  if (!user) {
    return json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  }

  // ---- GET /api/user/favorites ----
  if (method === "GET" && pathParts.length === 3) {
    const items = await readAll(env, user.id);
    return json({ favorites: items, count: items.length }, 200);
  }

  // ---- POST /api/user/favorites ----
  if (method === "POST" && pathParts.length === 3) {
    try {
      const body = await request.json() as Partial<FavoriteItem>;
      if (!body.id || !body.type || !body.title) {
        return json({ error: { code: "INVALID_FAVORITE", message: "id/type/title are required" } }, 400);
      }
      const items = await readAll(env, user.id);
      if (!items.some(f => f.id === body.id)) {
        items.push({ ...body, addedAt: Date.now() } as FavoriteItem);
        await writeAll(env, user.id, items);
      }
      return json({ favorites: items, count: items.length }, 200);
    } catch (e) {
      return json({ error: { code: "INVALID_JSON", message: "invalid JSON body" } }, 400);
    }
  }

  // ---- DELETE /api/user/favorites/:id ----
  if (method === "DELETE" && pathParts.length === 4) {
    const id = decodeURIComponent(pathParts[3]);
    const items = await readAll(env, user.id);
    const filtered = items.filter(f => f.id !== id);
    await writeAll(env, user.id, filtered);
    return json({ favorites: filtered, count: filtered.length }, 200);
  }

  return json({ error: { code: "NOT_FOUND", message: "endpoint not found" } }, 404);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
