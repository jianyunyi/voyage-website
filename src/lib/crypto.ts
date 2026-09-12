import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const KEY_HEX = process.env.PHONE_ENCRYPTION_KEY ?? '';

/**
 * Encrypt text with AES-256-GCM using PHONE_ENCRYPTION_KEY (32-byte hex).
 * Fallback: if key not present or invalid, store as PLAINTEXT:base64 for dev convenience.
 */
export function encryptText(plain: string): string {
  if (KEY_HEX.length === 64) {
    const key = Buffer.from(KEY_HEX, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  // Fallback for local/dev: mark as plaintext (base64) to avoid breaking runs.
  // WARNING: Set PHONE_ENCRYPTION_KEY in production.
  console.warn('PHONE_ENCRYPTION_KEY not set or invalid; storing phone in PLAINTEXT base64');
  return 'PLAINTEXT:' + Buffer.from(plain, 'utf8').toString('base64');
}

export function decryptText(data: string): string {
  if (typeof data !== 'string') return '';
  if (data.startsWith('PLAINTEXT:')) {
    return Buffer.from(data.slice('PLAINTEXT:'.length), 'base64').toString('utf8');
  }

  if (KEY_HEX.length === 64) {
    const buf = Buffer.from(data, 'base64');
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const encrypted = buf.slice(28);
    const key = Buffer.from(KEY_HEX, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return out.toString('utf8');
  }

  throw new Error('PHONE_ENCRYPTION_KEY not configured');
}
