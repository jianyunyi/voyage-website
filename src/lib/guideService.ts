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
  status?: 'pending' | 'published' | 'rejected';
  source?: 'user' | 'admin';
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

export async function fetchPublishedGuides(): Promise<TravelGuide[]> {
  try {
    const response = await fetch('/api/guides');
    const data = (await response.json()) as GuidesListResponse;
    if (!data.success) return [];
    return data.guides;
  } catch {
    return [];
  }
}

export async function submitGuide(payload: GuideSubmitPayload): Promise<GuideMutationResponse> {
  try {
    const response = await fetch('/api/guides/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as GuideMutationResponse;
  } catch {
    return { success: false, message: '投稿失败，请稍后重试' };
  }
}

export async function createGuideAsAdmin(
  payload: AdminGuidePayload
): Promise<GuideMutationResponse> {
  try {
    const { adminKey, ...body } = payload;
    const response = await fetch('/api/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(body),
    });
    return (await response.json()) as GuideMutationResponse;
  } catch {
    return { success: false, message: '发布失败，请稍后重试' };
  }
}

export async function updateGuideStatus(
  id: string,
  status: 'published' | 'rejected',
  adminKey: string
): Promise<GuideMutationResponse> {
  try {
    const response = await fetch(`/api/guides/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ status }),
    });
    return (await response.json()) as GuideMutationResponse;
  } catch {
    return { success: false, message: '操作失败，请稍后重试' };
  }
}
