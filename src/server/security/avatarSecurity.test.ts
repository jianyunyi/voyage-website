import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAvatarUploadRequest } from './avatarSecurity';

test('accepts valid JPEG avatar metadata', () => {
  const result = validateAvatarUploadRequest({
    fileName: 'avatar.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 512_000,
  });

  assert.equal(result.valid, true);
});

test('rejects SVG avatar uploads', () => {
  const result = validateAvatarUploadRequest({
    fileName: 'avatar.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 512,
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, 'UPLOAD_UNSUPPORTED_MEDIA_TYPE');
});

test('rejects mismatched avatar extension and MIME type', () => {
  const result = validateAvatarUploadRequest({
    fileName: 'avatar.jpg',
    mimeType: 'image/png',
    sizeBytes: 512_000,
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, 'UPLOAD_INVALID_FORMAT');
});

test('rejects oversized avatar uploads', () => {
  const result = validateAvatarUploadRequest({
    fileName: 'avatar.webp',
    mimeType: 'image/webp',
    sizeBytes: 6 * 1024 * 1024,
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, 'UPLOAD_TOO_LARGE');
});
