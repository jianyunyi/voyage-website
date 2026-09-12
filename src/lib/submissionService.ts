export interface SubmissionComment {
  user: string;
  content: string;
  date: string;
  rating?: number;
}

export interface GuideSubmission {
  id: string;
  type: 'guide';
  title: string;
  author: string;
  destination: string;
  days: number;
  budget: number;
  likes: number;
  favoritesCount: number;
  image: string;
  tags: string[];
  content: string;
  status: string;
  source: string;
  moderationReason?: string;
  createdAt: string;
  updatedAt: string;
  comments: SubmissionComment[];
}

export interface FoodSubmission {
  id: string;
  type: 'food';
  title: string;
  name: string;
  province: string;
  city: string;
  address: string;
  rating: number;
  reviews: number;
  favoritesCount: number;
  typeLabel: string;
  image: string;
  price: string;
  description: string;
  tags: string[];
  status: string;
  source: string;
  moderationReason?: string;
  createdAt: string;
  updatedAt: string;
  comments: SubmissionComment[];
}

export type UserSubmission = GuideSubmission | FoodSubmission;

type SubmissionsResponse =
  | {
      success: true;
      submissions: UserSubmission[];
      guides: GuideSubmission[];
      foods: FoodSubmission[];
      statusLabels: Record<string, string>;
    }
  | { success: false; message: string };

export async function fetchMySubmissions(userId: string): Promise<{
  submissions: UserSubmission[];
  statusLabels: Record<string, string>;
}> {
  try {
    const data = await idempotentJson<SubmissionsResponse>(
      `/api/users/${encodeURIComponent(userId)}/submissions`
    );
    if (!data.success) {
      return { submissions: [], statusLabels: {} };
    }
    return { submissions: data.submissions, statusLabels: data.statusLabels };
  } catch {
    return { submissions: [], statusLabels: {} };
  }
}

export async function syncFavoriteToServer(
  userId: string,
  itemId: string,
  itemType: 'guide' | 'food' | 'hotel' | 'route',
  favorited: boolean
): Promise<number | null> {
  try {
    const data = await idempotentJson<{ success: boolean; favoritesCount?: number }>(
      '/api/favorites/toggle',
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, itemId, itemType, favorited }),
      }
    );
    if (!data.success) return null;
    return data.favoritesCount ?? null;
  } catch {
    return null;
  }
}
import { idempotentJson } from './idempotentFetch';
