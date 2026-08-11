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

/** 获取全部收藏 */
export async function fetchFavorites(): Promise<FavoriteItem[]> {
  const res = await fetch("/api/user/favorites");
  if (!res.ok) throw new Error(`获取收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}

/** 新增收藏 */
export async function addFavoriteRemote(item: FavoriteItem): Promise<FavoriteItem[]> {
  const res = await fetch("/api/user/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`添加收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}

/** 删除收藏 */
export async function removeFavoriteRemote(id: string): Promise<FavoriteItem[]> {
  const res = await fetch(`/api/user/favorites/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`删除收藏失败 (${res.status})`);
  const data = await res.json() as { favorites: FavoriteItem[] };
  return data.favorites;
}
