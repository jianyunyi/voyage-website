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
  IMAGES_BUCKET?: R2Bucket;
}

const PENDING_INDEX_KEY = "submissions:index";
const PUBLIC_GUIDES_KEY = "guides:public";
const PUBLIC_FOODS_KEY = "foods:public";
type PendingEntry = { id: string; ownerId: string };

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

export interface PublicGuide {
  id: string;
  title: string;
  author: string;
  destination: string;
  days: number;
  budget: number;
  likes: number;
  image: string;
  tags: string[];
  content: string[];
  highlights: string[];
  comments: [];
}

export interface PublicFood {
  id: string;
  name: string;
  author: string;
  city: string;
  address: string;
  type: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
}

const keyFor = (userId: string) => `submissions:${userId}`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
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

  if (method === "GET" && url.pathname === "/api/submissions/admin") {
    if (!isAdmin(user.id, env.ADMIN_IDS)) return json({ error: { code: "FORBIDDEN", message: "仅管理员可查看审核队列" } }, 403);
    const raw = await env.FAVORITES_KV.get(PENDING_INDEX_KEY, "json");
    const entries: PendingEntry[] = Array.isArray(raw) ? raw as PendingEntry[] : [];
    const submissions = (await Promise.all(entries.map(entry => findSubmission(env, entry)))).filter(Boolean);
    return json({ submissions, count: submissions.length }, 200);
  }

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
    const pendingRaw = await env.FAVORITES_KV.get(PENDING_INDEX_KEY, "json");
    const pendingEntries: PendingEntry[] = Array.isArray(pendingRaw) ? pendingRaw as PendingEntry[] : [];
    await env.FAVORITES_KV.put(PENDING_INDEX_KEY, JSON.stringify(pendingEntries.filter(entry => entry.id !== id)));
    const publicRaw = await env.FAVORITES_KV.get(updatedPublicKey(list, id), "json");
    if (Array.isArray(publicRaw)) {
      await env.FAVORITES_KV.put(updatedPublicKey(list, id), JSON.stringify(publicRaw.filter((item: { id?: string }) => item.id !== id)));
    }
    return json({ submissions: next, count: next.length }, 200);
  }

  // ---- POST /api/submissions/:id/approve|reject（审核，仅管理员）----
  if (method === "POST" && (pathSeg === "approve" || pathSeg === "reject")) {
    const id = url.pathname.split("/").filter(Boolean).slice(-2)[0];
    if (!id) return json({ error: { code: "INVALID_ID", message: "submission id required" } }, 400);

    // 管理员校验：ADMIN_IDS 逗号分隔（未配置时无管理员）
    if (!isAdmin(user.id, env.ADMIN_IDS)) {
      return json({ error: { code: "FORBIDDEN", message: "仅管理员可审核" } }, 403);
    }

    const pendingRaw = await env.FAVORITES_KV.get(PENDING_INDEX_KEY, "json");
    const pendingEntries: PendingEntry[] = Array.isArray(pendingRaw) ? pendingRaw as PendingEntry[] : [];
    const pendingEntry = pendingEntries.find(entry => entry.id === id);
    const target = pendingEntry ? await findSubmission(env, pendingEntry) : null;
    if (!target) return json({ error: { code: "NOT_FOUND", message: "投稿不存在" } }, 404);
    const ownerId = pendingEntry?.ownerId;
    const ownerKey = ownerId ? `submissions:${ownerId}` : "";
    const ownerListRaw = ownerKey ? await env.FAVORITES_KV.get(ownerKey, "json") : null;
    const ownerList: Submission[] = Array.isArray(ownerListRaw) ? ownerListRaw as Submission[] : [];
    const nextStatus = pathSeg === "approve" ? "approved" : "rejected";
    const next = ownerList.map(s => s.id === id ? { ...s, status: nextStatus as "approved" | "rejected" } : s);
    if (!next.some(s => s.id === id)) return json({ error: { code: "NOT_FOUND", message: "投稿不存在" } }, 404);
    await env.FAVORITES_KV.put(ownerKey, JSON.stringify(next));
    const updated = next.find(s => s.id === id);
    await env.FAVORITES_KV.put(PENDING_INDEX_KEY, JSON.stringify(pendingEntries.filter(entry => entry.id !== id)));
    if (updated?.status === "approved" && updated.type === "guide") {
      const publicRaw = await env.FAVORITES_KV.get(PUBLIC_GUIDES_KEY, "json");
      const publicGuides: PublicGuide[] = Array.isArray(publicRaw) ? publicRaw as PublicGuide[] : [];
      await env.FAVORITES_KV.put(PUBLIC_GUIDES_KEY, JSON.stringify([toPublicGuide(updated), ...publicGuides.filter(item => item.id !== updated.id)]));
    } else if (updated?.type === "food") {
      const publicRaw = await env.FAVORITES_KV.get(PUBLIC_FOODS_KEY, "json");
      const publicFoods: PublicFood[] = Array.isArray(publicRaw) ? publicRaw as PublicFood[] : [];
      await env.FAVORITES_KV.put(PUBLIC_FOODS_KEY, JSON.stringify([toPublicFood(updated), ...publicFoods.filter(item => item.id !== updated.id)]));
    }
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

      const image = typeof body.extra?.image === "string" ? await storeImage(body.extra.image, user.id, env) : undefined;
      const submission: Submission = {
        id: `sub_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        type: body.type,
        title: body.title.trim(),
        destination: body.destination?.trim() || undefined,
        content: body.content.trim(),
        extra: { ...(body.extra || {}), ...(image ? { image } : {}), authorId: user.id, author: user.nickname },
        status: "pending",
        createdAt: Date.now(),
      };

      list.unshift(submission);
      await env.FAVORITES_KV.put(keyFor(user.id), JSON.stringify(list));
      const pendingRaw = await env.FAVORITES_KV.get(PENDING_INDEX_KEY, "json");
      const pendingEntries: PendingEntry[] = Array.isArray(pendingRaw) ? pendingRaw as PendingEntry[] : [];
      await env.FAVORITES_KV.put(PENDING_INDEX_KEY, JSON.stringify([{ id: submission.id, ownerId: user.id }, ...pendingEntries]));
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

function isAdmin(userId: string, adminIds?: string): boolean {
  return (adminIds || "").split(",").map(value => value.trim()).filter(Boolean).includes(userId);
}

async function findSubmission(env: SubmissionEnv, entry: PendingEntry): Promise<Submission | null> {
  const raw = await env.FAVORITES_KV.get(keyFor(entry.ownerId), "json");
  const list: Submission[] = Array.isArray(raw) ? raw as Submission[] : [];
  return list.find(item => item.id === entry.id) || null;
}

function toPublicGuide(submission: Submission): PublicGuide {
  const extra = submission.extra || {};
  return {
    id: submission.id,
    title: submission.title,
    author: String(extra.author || "旅行者"),
    destination: submission.destination || "未知目的地",
    days: Number(extra.days) || 1,
    budget: Number(extra.budget) || 0,
    likes: 0,
    image: typeof extra.image === "string" ? extra.image : "",
    tags: Array.isArray(extra.tags) ? extra.tags.filter((tag): tag is string => typeof tag === "string") : [],
    content: submission.content.split(/\n+/).map(item => item.trim()).filter(Boolean),
    highlights: Array.isArray(extra.highlights) ? extra.highlights.filter((item): item is string => typeof item === "string") : [],
    comments: [],
  };
}

export async function handlePublicGuides(_request: Request, _url: URL, env: SubmissionEnv): Promise<Response> {
  const raw = await env.FAVORITES_KV.get(PUBLIC_GUIDES_KEY, "json");
  const guides: PublicGuide[] = Array.isArray(raw) ? raw as PublicGuide[] : [];
  return json({ guides, count: guides.length }, 200);
}

export async function handlePublicFoods(_request: Request, _url: URL, env: SubmissionEnv): Promise<Response> {
  const raw = await env.FAVORITES_KV.get(PUBLIC_FOODS_KEY, "json");
  const foods: PublicFood[] = Array.isArray(raw) ? raw as PublicFood[] : [];
  return json({ foods, count: foods.length }, 200);
}

export async function handleSubmissionImage(_request: Request, url: URL, env: SubmissionEnv): Promise<Response> {
  if (!env.IMAGES_BUCKET) return json({ error: { code: "IMAGE_STORAGE_NOT_CONFIGURED", message: "图片存储未配置" } }, 503);
  const key = decodeURIComponent(url.pathname.replace("/api/submissions/image/", ""));
  if (!key || !key.startsWith("submission-images/")) return json({ error: { code: "INVALID_IMAGE", message: "图片地址无效" } }, 400);
  const object = await env.IMAGES_BUCKET.get(key);
  if (!object) return json({ error: { code: "IMAGE_NOT_FOUND", message: "图片不存在" } }, 404);
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
}

async function storeImage(dataUrl: string, userId: string, env: SubmissionEnv): Promise<string | undefined> {
  if (!env.IMAGES_BUCKET || !dataUrl.startsWith("data:image/")) return undefined;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return undefined;
  const [, contentType, encoded] = match;
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const extension = contentType.split("/")[1].replace("svg+xml", "svg");
  const key = `submission-images/${userId}/${crypto.randomUUID()}.${extension}`;
  await env.IMAGES_BUCKET.put(key, bytes, { httpMetadata: { contentType } });
  return `/api/submissions/image/${encodeURIComponent(key)}`;
}

function toPublicFood(submission: Submission): PublicFood {
  const extra = submission.extra || {};
  return {
    id: submission.id,
    name: submission.title,
    author: String(extra.author || "旅行者"),
    city: submission.destination || String(extra.city || ""),
    address: String(extra.address || ""),
    type: String(extra.type || "地道美食"),
    price: Number(extra.budget) || 0,
    rating: 0,
    reviews: 0,
    image: typeof extra.image === "string" ? extra.image : "",
    description: submission.content,
  };
}

function updatedPublicKey(list: Submission[], id: string): string {
  const item = list.find(submission => submission.id === id);
  return item?.type === "food" ? PUBLIC_FOODS_KEY : PUBLIC_GUIDES_KEY;
}
