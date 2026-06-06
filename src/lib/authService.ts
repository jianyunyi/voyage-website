import type { User } from '../context/AuthContext';
import { normalizeEmail, normalizeName } from './authValidation';

export const DEMO_ACCOUNT = {
  email: 'demo@voyagex.com',
  password: '123456',
  user: {
    id: 'u1',
    email: 'demo@voyagex.com',
    name: '旅行体验官',
    avatar: 'https://i.pravatar.cc/150?u=u1',
  } satisfies User,
} as const;

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'STORAGE_ERROR';

export type AuthResult =
  | { success: true; user: User }
  | { success: false; code: AuthErrorCode; message: string };

async function parseAuthResponse(response: Response): Promise<AuthResult> {
  const data = (await response.json()) as AuthResult;
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  if (
    normalizedEmail === DEMO_ACCOUNT.email &&
    password === DEMO_ACCOUNT.password
  ) {
    return { success: true, user: { ...DEMO_ACCOUNT.user, email: normalizedEmail } };
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    const result = await parseAuthResponse(response);
    return result;
  } catch {
    return {
      success: false,
      code: 'STORAGE_ERROR',
      message: '登录失败，请稍后重试',
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
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        name: normalizedName,
      }),
    });

    const result = await parseAuthResponse(response);
    return result;
  } catch {
    return {
      success: false,
      code: 'STORAGE_ERROR',
      message: '注册失败，请稍后重试',
    };
  }
}
