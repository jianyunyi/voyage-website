import { travelGuides as editorialGuideSeeds } from '../data/guides';
import { idempotentJson } from './idempotentFetch';

export interface TravelGuide {
  id: string;
  title: string;
  author: string;
  destination: string;
  days: number;
  budget: number;
  likes: number;
  image: string;
  tags: string[];
  content?: string;
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

export interface GuideSubmitPayload {
  title: string;
  destination: string;
  days: number;
  budget: number;
  content: string;
  author: string;
  authorId?: string;
  image?: string;
  tags?: string[];
}

export interface AdminGuidePayload extends GuideSubmitPayload {
  adminKey: string;
  tags?: string[];
}

type GuidesListResponse =
  | { success: true; guides: TravelGuide[] }
  | { success: false; message: string };

type GuideMutationResponse =
  | { success: true; guide: TravelGuide; message?: string }
  | { success: false; message: string };

const editorialGuides: TravelGuide[] = editorialGuideSeeds.map((guide) => ({
  ...guide,
  content: guide.content.join('\n\n'),
  source: 'admin',
  status: 'published',
}));

export async function fetchPublishedGuides(): Promise<TravelGuide[]> {
  try {
    const data = await idempotentJson<GuidesListResponse>('/api/guides');
    return data.success && data.guides.length > 0 ? data.guides : editorialGuides;
  } catch {
    return editorialGuides;
  }
}

export async function submitGuide(payload: GuideSubmitPayload): Promise<GuideMutationResponse> {
  try {
    return await idempotentJson<GuideMutationResponse>('/api/guides/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { success: false, message: '投稿失败，请稍后重试' };
  }
}

export async function createGuideAsAdmin(
  payload: AdminGuidePayload
): Promise<GuideMutationResponse> {
  try {
    const { adminKey, ...body } = payload;
    return await idempotentJson<GuideMutationResponse>('/api/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { success: false, message: '发布失败，请稍后重试' };
  }
}

export async function updateGuideStatus(
  id: string,
  status: 'approved' | 'published' | 'rejected' | 'removed',
  adminKey: string
): Promise<GuideMutationResponse> {
  try {
    return await idempotentJson<GuideMutationResponse>(`/api/guides/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ status }),
    });
  } catch {
    return { success: false, message: '操作失败，请稍后重试' };
  }
}
