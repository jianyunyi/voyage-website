export interface FoodReview {
  _id?: string;
  user: string;
  rating: number;
  date: string;
  content: string;
}

export interface FoodItem {
  id: string;
  name: string;
  province: string;
  city: string;
  address: string;
  rating: number;
  reviews: number;
  type: string;
  image: string;
  price: string;
  description: string;
  tags: string[];
  reviewsList: FoodReview[];
  author?: string;
  status?:
    | 'draft'
    | 'pending_review'
    | 'auto_rejected'
    | 'needs_manual_review'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'removed';
  source?: 'user' | 'admin';
  riskScore?: number;
  riskLabels?: string[];
}

export interface FoodSubmitPayload {
  name: string;
  province: string;
  city: string;
  address: string;
  type: string;
  price: number | string;
  description: string;
  author: string;
  authorId?: string;
  image?: string;
  tags?: string[];
}

type FoodsListResponse =
  | { success: true; foods: FoodItem[] }
  | { success: false; message: string };

type FoodMutationResponse =
  | { success: true; food: FoodItem; message?: string }
  | { success: false; message: string };

export async function fetchPublishedFoods(): Promise<FoodItem[]> {
  try {
    const data = await idempotentJson<FoodsListResponse>('/api/foods');
    if (!data.success) return [];
    return data.foods;
  } catch {
    return [];
  }
}

export async function submitFood(payload: FoodSubmitPayload): Promise<FoodMutationResponse> {
  try {
    return await idempotentJson<FoodMutationResponse>('/api/foods/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { success: false, message: '投稿失败，请稍后重试' };
  }
}
import { idempotentJson } from './idempotentFetch';
