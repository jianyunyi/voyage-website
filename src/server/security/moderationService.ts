export type ModeratedContentStatus =
  | 'draft'
  | 'pending_review'
  | 'auto_rejected'
  | 'needs_manual_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'removed';

export interface ModerationInput {
  title?: string;
  body: string;
  imageUrl?: string;
}

export interface ModerationDecision {
  status: ModeratedContentStatus;
  canPublish: boolean;
  riskScore: number;
  riskLabels: string[];
}

export type ModerationAdminDecision = 'approve' | 'publish' | 'reject' | 'remove';

const unsafeTextPatterns = [
  /\bscam\b/i,
  /\billegal\b/i,
  /\bgambling\b/i,
  /\bmalware\b/i,
  /诈骗/,
  /赌博/,
  /木马/,
  /违法/,
];

function isUnsafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return true;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol !== 'https:';
  } catch {
    return true;
  }
}

export function moderateSubmission(input: ModerationInput): ModerationDecision {
  const text = `${input.title ?? ''}\n${input.body}`;
  const riskLabels: string[] = [];

  if (unsafeTextPatterns.some((pattern) => pattern.test(text))) {
    riskLabels.push('unsafe_text');
  }

  if (input.imageUrl && isUnsafeUrl(input.imageUrl)) {
    riskLabels.push('unsafe_url');
  }

  const riskScore = riskLabels.length * 50;
  if (riskScore >= 50) {
    return {
      status: 'auto_rejected',
      canPublish: false,
      riskScore,
      riskLabels,
    };
  }

  return {
    status: 'pending_review',
    canPublish: false,
    riskScore,
    riskLabels,
  };
}

export function canExposePublicly(status: ModeratedContentStatus): boolean {
  return status === 'published';
}

export function applyModerationDecision(
  currentStatus: ModeratedContentStatus,
  decision: ModerationAdminDecision
): ModeratedContentStatus | null {
  if (
    decision === 'approve' &&
    (currentStatus === 'pending_review' || currentStatus === 'needs_manual_review')
  ) {
    return 'approved';
  }

  if (decision === 'publish' && currentStatus === 'approved') {
    return 'published';
  }

  if (
    decision === 'reject' &&
    (currentStatus === 'pending_review' ||
      currentStatus === 'needs_manual_review' ||
      currentStatus === 'approved')
  ) {
    return 'rejected';
  }

  if (decision === 'remove' && currentStatus === 'published') {
    return 'removed';
  }

  return null;
}

export type ModerationResolvedAction =
  | { action: 'publish'; nextStatus: 'published' }
  | { action: 'update'; nextStatus: ModeratedContentStatus }
  | { action: 'delete' };

export function resolveModerationAction(
  currentStatus: ModeratedContentStatus,
  decision: ModerationAdminDecision
): ModerationResolvedAction | null {
  if (
    decision === 'approve' &&
    (currentStatus === 'pending_review' ||
      currentStatus === 'needs_manual_review' ||
      currentStatus === 'approved')
  ) {
    return { action: 'publish', nextStatus: 'published' };
  }

  if (
    decision === 'reject' &&
    (currentStatus === 'pending_review' ||
      currentStatus === 'needs_manual_review' ||
      currentStatus === 'approved' ||
      currentStatus === 'auto_rejected')
  ) {
    return { action: 'delete' };
  }

  const nextStatus = applyModerationDecision(currentStatus, decision);
  return nextStatus ? { action: 'update', nextStatus } : null;
}
