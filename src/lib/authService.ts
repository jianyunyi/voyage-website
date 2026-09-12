import type { User } from '../context/AuthContext';
import { normalizeEmail, normalizeName } from './authValidation';
import { idempotentJson } from './idempotentFetch';

export const DEMO_ACCOUNT = {
  email: 'demo@voyagex.com',
  password: '123456',
    user: {
    id: 'u1',
    email: 'demo@voyagex.com',
    name: '旅行体验官',
    avatar: 'https://i.pravatar.cc/150?u=u1',
    role: 'user',
  } satisfies User,
} as const;

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'STORAGE_ERROR'
  | 'SMS_INVALID_INPUT'
  | 'SMS_INVALID_CODE'
  | 'SMS_CHALLENGE_EXPIRED'
  | 'SMS_CHALLENGE_LOCKED'
  | 'SMS_RATE_LIMITED'
  | 'SMS_PHONE_RATE_LIMITED'
  | 'SMS_EMAIL_RATE_LIMITED'
  | 'SMS_BUDGET_EXHAUSTED';

export type AuthResult =
  | { success: true; user: User }
  | { success: false; code: AuthErrorCode; message: string };

export type SmsLoginRequestResult =
  | {
      success: true;
      challengeId: string;
      expiresInSeconds: number;
      retryAfterSeconds: number;
      debugCode?: string;
      message: string;
    }
  | { success: false; code: AuthErrorCode; message: string; retryAfterSeconds?: number };

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  if (
    normalizedEmail === DEMO_ACCOUNT.email &&
    password === DEMO_ACCOUNT.password
  ) {
    return { success: true, user: { ...DEMO_ACCOUNT.user, email: normalizedEmail } };
  }

  try {
    return await idempotentJson<AuthResult>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
  } catch {
    return {
      success: false,
      code: 'STORAGE_ERROR',
      message: '登录失败，请稍后重试',
    };
  }
}

export async function requestSmsLoginCode(
  email: string,
  phone: string
): Promise<SmsLoginRequestResult> {
  try {
    return await idempotentJson<SmsLoginRequestResult>('/api/auth/login/sms/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email), phone: phone.trim() }),
    });
  } catch {
    return {
      success: false,
      code: 'STORAGE_ERROR',
      message: '验证码发送失败，请稍后重试',
    };
  }
}

export async function verifySmsLoginCode(
  challengeId: string,
  code: string
): Promise<AuthResult> {
  try {
    return await idempotentJson<AuthResult>('/api/auth/login/sms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, code: code.trim() }),
    });
  } catch {
    return {
      success: false,
      code: 'STORAGE_ERROR',
      message: '验证码校验失败，请稍后重试',
    };
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  if (normalizedEmail === DEMO_ACCOUNT.email) {
    return {
      success: false,
      code: 'EMAIL_TAKEN',
      message: '该邮箱已被注册',
    };
  }

  try {
    return await idempotentJson<AuthResult>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        name: normalizedName,
      }),
    });
  } catch {
    return {
      success: false,
      code: 'STORAGE_ERROR',
      message: '注册失败，请稍后重试',
    };
  }
}
