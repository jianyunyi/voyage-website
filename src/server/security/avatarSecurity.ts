export type AvatarUploadStatus =
  | 'upload_pending'
  | 'uploaded'
  | 'validating'
  | 'quarantined'
  | 'approved'
  | 'rejected'
  | 'deleted';

export type AvatarUploadErrorCode =
  | 'UPLOAD_INVALID_FORMAT'
  | 'UPLOAD_TOO_LARGE'
  | 'UPLOAD_UNSUPPORTED_MEDIA_TYPE';

export interface AvatarUploadRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export type AvatarUploadValidationResult =
  | { valid: true; normalizedExtension: string; publicMimeType: string }
  | { valid: false; code: AvatarUploadErrorCode; message: string };

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const allowedTypes = new Map<string, string>([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

export function validateAvatarUploadRequest(
  input: AvatarUploadRequest
): AvatarUploadValidationResult {
  const extension = input.fileName.split('.').pop()?.toLowerCase() ?? '';
  const expectedMimeType = allowedTypes.get(extension);

  if (!expectedMimeType) {
    return {
      valid: false,
      code: 'UPLOAD_UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported avatar image type.',
    };
  }

  if (input.mimeType !== expectedMimeType) {
    return {
      valid: false,
      code: 'UPLOAD_INVALID_FORMAT',
      message: 'Avatar file extension and MIME type do not match.',
    };
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return {
      valid: false,
      code: 'UPLOAD_INVALID_FORMAT',
      message: 'Avatar file size is invalid.',
    };
  }

  if (input.sizeBytes > MAX_AVATAR_SIZE_BYTES) {
    return {
      valid: false,
      code: 'UPLOAD_TOO_LARGE',
      message: 'Avatar image is larger than 5 MB.',
    };
  }

  return {
    valid: true,
    normalizedExtension: extension === 'jpeg' ? 'jpg' : extension,
    publicMimeType: expectedMimeType,
  };
}
