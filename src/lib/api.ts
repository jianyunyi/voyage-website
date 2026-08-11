/**
 * VoyageX API 客户端 — 集中处理后端请求
 */

export interface CompareItem {
  id: string;
  platform: string;
  price: string;
  priceValue: number;
  type?: string;
  time?: string;
  name?: string;
  features: string[];
  url?: string;
}

export interface CompareParams {
  category: "transport" | "hotel" | "car";
  destination?: string;
  origin?: string;
  checkIn?: string;
  checkOut?: string;
}

/**
 * 调用 /api/compare 聚合接口
 * 返回标准化后的比价商品列表（按价格升序）
 */
export async function fetchCompare(params: CompareParams): Promise<CompareItem[]> {
  const qs = new URLSearchParams();
  qs.set("category", params.category);
  if (params.destination) qs.set("destination", params.destination);
  if (params.origin) qs.set("origin", params.origin);
  if (params.checkIn) qs.set("checkIn", params.checkIn);
  if (params.checkOut) qs.set("checkOut", params.checkOut);

  const res = await fetch(`/api/compare?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`比价服务异常 (${res.status})`);
  }
  const data = await res.json() as { items: CompareItem[] };
  return data.items;
}


// ============================================================
// Favorites API
// ============================================================

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

/** 获取全部收藏（需登录） */
export async function fetchFavorites(accessToken?: string | null): Promise<FavoriteItem[]> {
  const res = await fetch("/api/user/favorites", {
    headers: accessToken ? { Authorization: "Bearer " + accessToken } : undefined,
  });
  if (!res.ok) throw new Error(`获取收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}

/** 新增收藏（需登录） */
export async function addFavoriteRemote(item: FavoriteItem, accessToken?: string | null): Promise<FavoriteItem[]> {
  const res = await fetch("/api/user/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}) },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`添加收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}

/** 删除收藏（需登录） */
export async function removeFavoriteRemote(id: string, accessToken?: string | null): Promise<FavoriteItem[]> {
  const res = await fetch(`/api/user/favorites/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: "Bearer " + accessToken } : undefined,
  });
  if (!res.ok) throw new Error(`删除收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}


// ============================================================
// Hotel Detail API
// ============================================================

export interface HotelRoom {
  id: string;
  name: string;
  size: string;
  bed: string;
  price: string;
  priceValue: number;
  features: string[];
}

export interface HotelReview {
  id: number;
  user: string;
  rating: number;
  date: string;
  content: string;
}

export interface HotelDetail {
  id: string;
  name: string;
  platform: string;
  rating: number;
  reviewsCount: number;
  address: string;
  phone: string;
  description: string;
  images: string[];
  amenities: string[];
  rooms: HotelRoom[];
  reviews: HotelReview[];
}

export async function fetchHotelDetail(id: string): Promise<HotelDetail> {
  const res = await fetch(`/api/hotel/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`获取酒店详情失败 (${res.status})`);
  return await res.json() as HotelDetail;
}

// ============================================================
// Route API
// ============================================================

export interface RouteOption {
  id: string;
  type: "driving" | "train" | "flight";
  label: string;
  timeSec: number;
  timeLabel: string;
  distanceMeters?: number;
  distanceLabel?: string;
  price?: string;
  priceValue?: number;
  tolls?: string;
  tag?: string;
  score: number;
  source: "amap" | "estimate";
}

export async function fetchRoutes(originId: string, destId: string): Promise<RouteOption[]> {
  const qs = new URLSearchParams({ originId, destId });
  const res = await fetch(`/api/route?${qs.toString()}`);
  if (!res.ok) throw new Error(`获取路线失败 (${res.status})`);
  const data = await res.json() as { routes: RouteOption[] };
  return data.routes;
}

// ============================================================
// Itinerary API
// ============================================================

export interface ItineraryRequest {
  origin: string;
  destinations: string[];
  dates: { start: string; end: string };
  preferences: {
    budget: "budget" | "moderate" | "luxury";
    travel_mode: "fastest" | "relaxed" | "balanced";
    interests?: string[];
  };
}

export interface ItineraryStep {
  time: string;
  type: string;
  title: string;
  description: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  steps: ItineraryStep[];
}

export async function generateItineraryRemote(req: ItineraryRequest): Promise<{ days: ItineraryDay[]; sources: string[] }> {
  const res = await fetch("/api/itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`生成行程失败 (${res.status})`);
  return await res.json();
}


// ============================================================
// Auth API（JWT access/refresh）
// ============================================================

export interface AuthUser {
  id: string;
  nickname: string;
  createdAt: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: AuthUser;
}

export async function registerRemote(nickname: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  const data = await res.json() as AuthResult;
  if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message || "注册失败");
  return data;
}

export async function loginRemote(nickname: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  const data = await res.json() as AuthResult;
  if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message || "登录失败");
  return data;
}

export async function refreshRemote(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json() as AuthTokens;
  if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message || "登录已过期");
  return data;
}

export async function logoutRemote(refreshToken: string): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: "Bearer " + accessToken },
  });
  const data = await res.json() as { user: AuthUser; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "获取用户失败");
  return data.user;
}


// ============================================================
// Submissions API（用户投稿）
// ============================================================

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

/** 创建投稿（需登录） */
export async function createSubmissionRemote(payload: { type: "guide" | "food"; title: string; destination?: string; content: string; extra?: Record<string, unknown> }, accessToken?: string | null): Promise<Submission> {
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}) },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { submission: Submission; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "投稿失败");
  return data.submission;
}

/** 我的投稿（需登录） */
export async function fetchMySubmissions(accessToken?: string | null): Promise<Submission[]> {
  const res = await fetch("/api/submissions", {
    headers: accessToken ? { Authorization: "Bearer " + accessToken } : undefined,
  });
  if (!res.ok) throw new Error(`获取投稿失败 (${res.status})`);
  const data = await res.json() as { submissions: Submission[] };
  return data.submissions;
}
