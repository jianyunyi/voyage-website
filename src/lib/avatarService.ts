export type AvatarUploadStatus =
  | 'upload_pending'
  | 'uploaded'
  | 'validating'
  | 'quarantined'
  | 'approved'
  | 'rejected'
  | 'deleted';

type AvatarUploadStartResponse =
  | {
      success: true;
      assetId: string;
      uploadUrl: string;
      expiresInSeconds: number;
      headers: Record<string, string>;
    }
  | { success: false; code: string; message: string };

type AvatarUploadCompleteResponse =
  | { success: true; assetId: string; status: AvatarUploadStatus }
  | { success: false; code: string; message: string };

export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<{ success: true; avatarUrl: string } | { success: false; message: string }> {
  try {
    const start = await idempotentJson<AvatarUploadStartResponse>('/api/profile/avatar/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });

    if (start.success === false) {
      return { success: false, message: start.message };
    }

    const complete = await idempotentJson<AvatarUploadCompleteResponse>(
      `/api/profile/avatar/uploads/${start.assetId}/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ uploaded: true }),
      }
    );

    if (complete.success === false) {
      return { success: false, message: complete.message };
    }

    return {
      success: true,
      avatarUrl: `/api/users/${encodeURIComponent(userId)}/avatar?asset=${encodeURIComponent(start.assetId)}`,
    };
  } catch {
    return { success: false, message: '头像上传失败，请稍后重试' };
  }
}
import { idempotentJson } from './idempotentFetch';
