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
export async function fetchFavorites(_accessToken?: string | null): Promise<FavoriteItem[]> {
  const res = await fetch("/api/user/favorites", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`获取收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}

/** 新增收藏（需登录） */
export async function addFavoriteRemote(item: FavoriteItem, _accessToken?: string | null): Promise<FavoriteItem[]> {
  const res = await fetch("/api/user/favorites", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`添加收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}

/** 删除收藏（需登录） */
export async function removeFavoriteRemote(id: string, _accessToken?: string | null): Promise<FavoriteItem[]> {
  const res = await fetch(`/api/user/favorites/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
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
  type: "driving" | "train" | "flight" | "combined";
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
  isBest?: boolean;
  bestReason?: string;
  legs?: string[];
  source: "amap" | "estimate";
}

export interface RoutePoint {
  name: string;
  lng: number;
  lat: number;
}

/** 查询路线：支持城市 ID 或用户定位坐标 */
export async function fetchRoutes(
  originId: string,
  destId: string,
  originPoint?: RoutePoint,
  destPoint?: RoutePoint,
): Promise<RouteOption[]> {
  const params = new URLSearchParams();
  if (originId) params.set("originId", originId);
  if (destId) params.set("destId", destId);
  if (originPoint) {
    params.set("originLngLat", `${originPoint.lng},${originPoint.lat}`);
    params.set("originName", originPoint.name);
  }
  if (destPoint) {
    params.set("destLngLat", `${destPoint.lng},${destPoint.lat}`);
    params.set("destName", destPoint.name);
  }
  const res = await fetch(`/api/route?${params.toString()}`);
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
  avatar?: string | null;
  createdAt: number;
}

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthResult extends AuthTokens {
  user: AuthUser;
}

export async function registerRemote(nickname: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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
    credentials: "include",
    body: JSON.stringify({ nickname, password }),
  });
  const data = await res.json() as AuthResult;
  if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message || "登录失败");
  return data;
}

export async function refreshRemote(): Promise<AuthTokens> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json() as AuthTokens;
  if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message || "登录已过期");
  return data;
}

export async function logoutRemote(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
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
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

/** 创建投稿（需登录） */
export async function createSubmissionRemote(payload: { type: "guide" | "food"; title: string; destination?: string; content: string; extra?: Record<string, unknown> }, _accessToken?: string | null): Promise<Submission> {
  const res = await fetch("/api/submissions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { submission: Submission; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "投稿失败");
  return data.submission;
}

/** 我的投稿（需登录） */
export async function fetchMySubmissions(_accessToken?: string | null): Promise<Submission[]> {
  const res = await fetch("/api/submissions", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`获取投稿失败 (${res.status})`);
  const data = await res.json() as { submissions: Submission[] };
  return data.submissions;
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

export async function fetchPublicGuides(): Promise<PublicGuide[]> {
  const res = await fetch("/api/guides/public");
  if (!res.ok) throw new Error(`获取公开攻略失败 (${res.status})`);
  const data = await res.json() as { guides: PublicGuide[] };
  return data.guides;
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

export async function fetchPublicFoods(): Promise<PublicFood[]> {
  const res = await fetch("/api/food/public");
  if (!res.ok) throw new Error(`获取公开美食失败 (${res.status})`);
  const data = await res.json() as { foods: PublicFood[] };
  return data.foods;
}

export async function fetchAdminSubmissions(_accessToken?: string | null): Promise<Submission[]> {
  const res = await fetch("/api/submissions/admin", { credentials: "include" });
  const data = await res.json() as { submissions?: Submission[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `获取审核队列失败 (${res.status})`);
  return data.submissions || [];
}

export async function moderateSubmission(id: string, action: "approve" | "reject", _accessToken?: string | null): Promise<Submission> {
  const res = await fetch(`/api/submissions/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json() as { submission?: Submission; error?: { message?: string } };
  if (!res.ok || !data.submission) throw new Error(data.error?.message || `审核失败 (${res.status})`);
  return data.submission;
}


// ============================================================
// Saved Itineraries API（AI 行程保存）
// ============================================================

export interface SavedItineraryDay {
  day: number;
  date: string;
  steps: Array<{ time: string; type: string; title: string; description: string }>;
}

export interface SavedItinerary {
  id: string;
  title: string;
  destination?: string;
  days: number;
  startDate?: string;
  endDate?: string;
  budget?: string;
  dayData: SavedItineraryDay[];
  createdAt: number;
}

/** 保存 AI 行程（需登录） */
export async function saveItineraryRemote(payload: { title: string; destination?: string; days?: number; startDate?: string; endDate?: string; budget?: string; dayData: SavedItineraryDay[] }, _accessToken?: string | null): Promise<SavedItinerary> {
  const res = await fetch("/api/itineraries", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { itinerary: SavedItinerary; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "保存行程失败");
  return data.itinerary;
}

/** 我的行程（需登录） */
export async function fetchMyItineraries(_accessToken?: string | null): Promise<SavedItinerary[]> {
  const res = await fetch("/api/itineraries", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`获取行程失败 (${res.status})`);
  const data = await res.json() as { itineraries: SavedItinerary[] };
  return data.itineraries;
}


// ============================================================
// Price Alerts API（比价降价提醒）
// ============================================================

export interface PriceAlert {
  id: string;
  itemId: string;
  title: string;
  category: "transport" | "hotel" | "car";
  subscribedPrice: number;
  currentPrice: number;
  dropped: boolean;
  dropPercent?: number;
  createdAt: number;
}

/** 订阅比价项（需登录） */
export async function subscribeAlertRemote(payload: { itemId: string; title: string; category?: string; subscribedPrice: number }, _accessToken?: string | null): Promise<PriceAlert[]> {
  const res = await fetch("/api/price-alerts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { alerts: PriceAlert[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "订阅失败");
  return data.alerts;
}

/** 我的订阅列表（需登录） */
export async function fetchAlertsRemote(_accessToken?: string | null): Promise<PriceAlert[]> {
  const res = await fetch("/api/price-alerts", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`获取订阅失败 (${res.status})`);
  const data = await res.json() as { alerts: PriceAlert[] };
  return data.alerts;
}

/** 检查降价（需登录，模拟波动） */
export async function checkAlertsRemote(_accessToken?: string | null): Promise<PriceAlert[]> {
  const res = await fetch("/api/price-alerts/check", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`检查降价失败 (${res.status})`);
  const data = await res.json() as { alerts: PriceAlert[] };
  return data.alerts;
}


// ============================================================
// Likes API（点赞互动）
// ============================================================

/** 点赞/取消（需登录） */
export async function toggleLikeRemote(itemId: string, _accessToken?: string | null): Promise<{ count: number; liked: boolean }> {
  const res = await fetch("/api/likes/toggle", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId }),
  });
  const data = await res.json() as { count: number; liked: boolean; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "点赞失败");
  return { count: data.count, liked: data.liked };
}

/** 批量查询点赞数 + 已赞状态（需登录） */
export async function fetchLikesRemote(ids: string[], _accessToken?: string | null): Promise<Record<string, { count: number; liked: boolean }>> {
  const res = await fetch(`/api/likes?ids=${encodeURIComponent(ids.join(","))}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`获取点赞失败 (${res.status})`);
  const data = await res.json() as { likes: Record<string, { count: number; liked: boolean }> };
  return data.likes;
}


/** 上传头像（base64 data URL，需登录） */
export async function uploadAvatarRemote(avatar: string, _accessToken?: string | null): Promise<AuthUser> {
  const res = await fetch("/api/auth/avatar", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatar }),
  });
  const data = await res.json() as { user: AuthUser; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "上传头像失败");
  return data.user;
}


// ============================================================
// Errors API（错误上报）
// ============================================================

/** 上报前端错误（fire-and-forget，无需登录） */
export async function reportErrorRemote(payload: { message: string; stack?: string; url?: string; type?: string }): Promise<void> {
  try {
    await fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // 上报失败不阻塞
  }
}


// ============================================================
// 用户资料 + 自助管理
// ============================================================

/** 修改昵称 */
export async function updateNicknameRemote(nickname: string, _token: string | null): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  const data = (await res.json()) as { user?: AuthUser; error?: { message?: string } };
  if (!res.ok || !data.user) throw new Error(data.error?.message || "修改昵称失败");
  return data.user;
}

/** 修改密码 */
export async function changePasswordRemote(oldPassword: string, newPassword: string, _token: string | null): Promise<void> {
  const res = await fetch("/api/auth/password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  const data = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || "修改密码失败");
}

/** 删除行程 */
export async function deleteItineraryRemote(id: string, _token: string | null): Promise<SavedItinerary[]> {
  const res = await fetch(`/api/itineraries/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = (await res.json()) as { itineraries?: SavedItinerary[]; error?: { message?: string } };
  if (!res.ok || !data.itineraries) throw new Error(data.error?.message || "删除行程失败");
  return data.itineraries;
}

/** 撤回投稿 */
export async function deleteSubmissionRemote(id: string, _token: string | null): Promise<Submission[]> {
  const res = await fetch(`/api/submissions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = (await res.json()) as { submissions?: Submission[]; error?: { message?: string } };
  if (!res.ok || !data.submissions) throw new Error(data.error?.message || "撤回投稿失败");
  return data.submissions;
}

/** 取消降价订阅 */
export async function deleteAlertRemote(id: string, _token: string | null): Promise<PriceAlert[]> {
  const res = await fetch(`/api/price-alerts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = (await res.json()) as { alerts?: PriceAlert[]; error?: { message?: string } };
  if (!res.ok || !data.alerts) throw new Error(data.error?.message || "取消订阅失败");
  return data.alerts;
}
