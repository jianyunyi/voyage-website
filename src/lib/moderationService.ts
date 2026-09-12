import { idempotentJson } from './idempotentFetch';

export interface ModerationQueueItem {
  id: string;
  type: 'guide' | 'food';
  title: string;
  author: string;
  destination: string;
  image: string;
  status: string;
  riskScore: number;
  riskLabels: string[];
  submittedAt: string;
}

type ModerationQueueResponse =
  | { success: true; items: ModerationQueueItem[] }
  | { success: false; message: string };

type ModerationDecisionResponse =
  | { success: true; item: { id: string; type: 'guide' | 'food'; status: string } }
  | { success: false; message: string };

export async function fetchModerationQueue(adminUserId: string): Promise<ModerationQueueItem[]> {
  try {
    const data = await idempotentJson<ModerationQueueResponse>(
      '/api/moderation/queue?status=pending_review',
      { headers: { 'x-user-id': adminUserId } }
    );
    if (!data.success) return [];
    return data.items;
  } catch {
    return [];
  }
}

export async function reviewModerationItem(
  adminUserId: string,
  item: Pick<ModerationQueueItem, 'id' | 'type'>,
  decision: 'approve' | 'reject'
): Promise<ModerationDecisionResponse> {
  try {
    return await idempotentJson<ModerationDecisionResponse>(
      `/api/moderation/items/${encodeURIComponent(item.id)}/decision`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
        },
        body: JSON.stringify({
          type: item.type,
          decision,
          reason: decision === 'approve' ? 'admin_approved' : 'admin_rejected',
        }),
      }
    );
  } catch {
    return { success: false, message: '审核操作失败，请稍后重试' };
  }
}
