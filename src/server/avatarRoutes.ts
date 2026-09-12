import { randomUUID } from 'node:crypto';
import { type Request, type Router } from 'express';
import User from '../lib/database/models/User';
import {
  type AvatarUploadStatus,
  validateAvatarUploadRequest,
} from './security/avatarSecurity';

interface AvatarAsset {
  id: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: AvatarUploadStatus;
  privateObjectKey: string;
  publicObjectKey?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const avatarAssets = new Map<string, AvatarAsset>();

function getAuthenticatedUserId(req: Request): string | null {
  const raw = req.headers['x-user-id'];
  if (Array.isArray(raw)) return raw[0] || null;
  return raw || null;
}

function toPublicAsset(asset: AvatarAsset) {
  return {
    id: asset.id,
    status: asset.status,
    rejectionReason: asset.rejectionReason,
    avatarUrl:
      asset.status === 'approved'
        ? `/api/users/${encodeURIComponent(asset.ownerId)}/avatar?asset=${encodeURIComponent(asset.id)}`
        : undefined,
  };
}

export function registerAvatarRoutes(router: Router) {
  router.post('/api/profile/avatar/uploads', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const { fileName, mimeType, sizeBytes } = req.body as {
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
    };

    const validation = validateAvatarUploadRequest({
      fileName: fileName ?? '',
      mimeType: mimeType ?? '',
      sizeBytes: Number(sizeBytes),
    });

    if (validation.valid === false) {
      const status = validation.code === 'UPLOAD_TOO_LARGE' ? 413 : validation.code === 'UPLOAD_UNSUPPORTED_MEDIA_TYPE' ? 415 : 400;
      return res.status(status).json({ success: false, code: validation.code, message: validation.message });
    }

    const assetId = randomUUID();
    const now = new Date();
    const asset: AvatarAsset = {
      id: assetId,
      ownerId: userId,
      fileName: fileName ?? 'avatar',
      mimeType: validation.publicMimeType,
      sizeBytes: Number(sizeBytes),
      status: 'upload_pending',
      privateObjectKey: `profile/original/${userId}/${assetId}`,
      createdAt: now,
      updatedAt: now,
    };
    avatarAssets.set(assetId, asset);

    return res.status(201).json({
      success: true,
      assetId,
      uploadUrl: `/api/profile/avatar/uploads/${assetId}/local-object`,
      expiresInSeconds: 300,
      headers: { 'Content-Type': validation.publicMimeType },
    });
  });

  router.post('/api/profile/avatar/uploads/:assetId/complete', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const asset = avatarAssets.get(req.params.assetId);
    if (!asset || asset.ownerId !== userId) {
      return res.status(403).json({ success: false, code: 'UPLOAD_FORBIDDEN', message: 'Upload does not belong to this user.' });
    }

    asset.status = 'approved';
    asset.publicObjectKey = `profile/approved/${userId}/${asset.id}.webp`;
    asset.updatedAt = new Date();
    await User.findByIdAndUpdate(userId, { avatarAssetId: asset.id });

    return res.status(202).json({ success: true, assetId: asset.id, status: asset.status });
  });

  router.get('/api/profile/avatar/uploads/:assetId', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const asset = avatarAssets.get(req.params.assetId);
    if (!asset || asset.ownerId !== userId) {
      return res.status(403).json({ success: false, code: 'UPLOAD_FORBIDDEN', message: 'Upload does not belong to this user.' });
    }

    return res.json({ success: true, asset: toPublicAsset(asset) });
  });

  router.get('/api/users/:userId/avatar', async (req, res) => {
    const requestedAsset = typeof req.query.asset === 'string' ? req.query.asset : undefined;
    const asset = requestedAsset ? avatarAssets.get(requestedAsset) : undefined;

    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' https://ui-avatars.com");
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (asset && asset.ownerId === req.params.userId && asset.status === 'approved') {
      return res.redirect(302, `https://ui-avatars.com/api/?name=${encodeURIComponent(req.params.userId)}&background=random`);
    }

    const user = await User.findById(req.params.userId).select('name');
    return res.redirect(302, `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'VoyageX')}&background=random`);
  });
}
