// ── API Base ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.json();
}

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
}

export interface PublicFood {
  id: string;
  name: string;
  province: string;
  city: string;
  address: string;
  rating: number;
  reviews: number;
  type: string;
  image: string;
  price: string;
  description: string;
  tags: string[];
  reviewsList: FoodReview[];
  author: string;
  status: string;
  source: string;
  riskScore: number;
  riskLabels: string[];
}

export interface FoodReview {
  user: string;
  rating: number;
  date: string;
  content: string;
}

export interface PublicGuide {
  id: string;
  title: string;
  author: string;
  destination: string;
  days: number;
  budget: number;
  likes: number;
  image: string;
  tags: string[];
  content: string;
  status: string;
  source: string;
  riskScore: number;
  riskLabels: string[];
}

export interface Submission {
  id: string;
  type: 'guide' | 'food';
  author: string;
  status: string;
  riskScore: number;
  riskLabels: string[];
  createdAt: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResult {
  success: true;
  user: PublicUser;
  session?: { expiresAt: string };
}

export interface AuthError {
  success: false;
  code: string;
  message: string;
}

export type AuthResponse = AuthResult | AuthError;

// ── API Response Wrappers ────────────────────────────────────────────────────

export interface FoodListResponse {
  success: boolean;
  foods: PublicFood[];
}

export interface GuideListResponse {
  success: boolean;
  guides: PublicGuide[];
}

export interface SubmissionsResponse {
  success: boolean;
  submissions: Submission[];
  statusLabels: Record<string, string>;
}

export interface ToggleFavoriteResponse {
  success: boolean;
  favoritesCount: number;
}

export interface SmsRequestResponse {
  success: boolean;
  challengeId?: string;
  expiresInSeconds?: number;
  retryAfterSeconds?: number;
  debugCode?: string;
  message?: string;
  code?: string;
}

export interface SmsVerifyResponse {
  success: boolean;
  user?: PublicUser;
  session?: { expiresAt: string };
  code?: string;
  message?: string;
}
