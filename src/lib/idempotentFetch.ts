type OperationStatus = 'pending' | 'success';

interface OperationRecord<T = unknown> {
  status: OperationStatus;
  timestamp: number;
  promise: Promise<T>;
  result?: T;
  idempotencyKey: string;
}

interface SharedRequestIdRecord {
  requestId: string;
  timestamp: number;
}

interface IdempotentJsonOptions {
  cacheSuccessMs?: number;
  ttlMs?: number;
}

const CHANNEL_NAME = 'voyagex-idempotent-request';
const DEFAULT_SUCCESS_CACHE_MS = 5_000;
const DEFAULT_TTL_MS = 30_000;
const MAX_CACHE_SIZE = 1_000;
const operationCache = new Map<string, OperationRecord>();

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; operationKey?: string; requestId?: string };
      if (data.type === 'NEW_REQUEST_ID' && data.operationKey && data.requestId) {
        writeSharedRequestId(data.operationKey, data.requestId);
      }
      if (data.type === 'CLEAR_REQUEST_ID' && data.operationKey) {
        removeSharedRequestId(data.operationKey);
      }
    };
  }
  return broadcastChannel;
}

function generateRequestId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const timestamp =
    typeof performance !== 'undefined'
      ? performance.now().toString(36)
      : Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function storageKey(operationKey: string): string {
  return `voyagex_idem_${operationKey}`;
}

function readSharedRequestId(operationKey: string, ttlMs: number): string | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const stored = storage.getItem(storageKey(operationKey));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SharedRequestIdRecord;
    if (Date.now() - parsed.timestamp > ttlMs) {
      storage.removeItem(storageKey(operationKey));
      return null;
    }
    return parsed.requestId;
  } catch {
    storage.removeItem(storageKey(operationKey));
    return null;
  }
}

function writeSharedRequestId(operationKey: string, requestId: string): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(
    storageKey(operationKey),
    JSON.stringify({
      requestId,
      timestamp: Date.now(),
    } satisfies SharedRequestIdRecord)
  );
}

function removeSharedRequestId(operationKey: string): void {
  getStorage()?.removeItem(storageKey(operationKey));
}

function getOrCreateRequestId(operationKey: string, ttlMs: number): string {
  const existing = readSharedRequestId(operationKey, ttlMs);
  if (existing) return existing;

  const requestId = generateRequestId();
  writeSharedRequestId(operationKey, requestId);
  getBroadcastChannel()?.postMessage({ type: 'NEW_REQUEST_ID', operationKey, requestId });
  return requestId;
}

function normalizeData(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data ?? '';

  const source = data as Record<string, unknown>;
  return Object.keys(source)
    .filter((key) => key !== 'timestamp' && key !== '_t')
    .sort()
    .reduce<Record<string, unknown>>((normalized, key) => {
      normalized[key] = normalizeData(source[key]);
      return normalized;
    }, {});
}

function parseBodyForFingerprint(body: BodyInit | null | undefined): unknown {
  if (!body || typeof body !== 'string') return body ?? '';
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeData(value));
}

function makeFingerprint(input: RequestInfo | URL, init?: RequestInit): string {
  const method = (init?.method ?? 'GET').toUpperCase();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const body = parseBodyForFingerprint(init?.body);
  return `${method}:${url}:${stableStringify(body)}`;
}

function cleanupExpired(now: number): void {
  for (const [key, record] of operationCache.entries()) {
    if (now - record.timestamp > DEFAULT_TTL_MS) {
      operationCache.delete(key);
    }
  }

  if (operationCache.size <= MAX_CACHE_SIZE) return;

  const entries = [...operationCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const deleteCount = Math.floor(MAX_CACHE_SIZE / 2);
  for (let index = 0; index < deleteCount; index += 1) {
    operationCache.delete(entries[index][0]);
  }
}

function sendMetric(metric: string, value: number): void {
  const monitor = (globalThis as typeof globalThis & {
    __monitor__?: { send: (payload: Record<string, unknown>) => void };
  }).__monitor__;

  monitor?.send({ metric, value, timestamp: Date.now() });
}

export async function idempotentJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: IdempotentJsonOptions = {}
): Promise<T> {
  const now = Date.now();
  const successCacheMs = options.cacheSuccessMs ?? DEFAULT_SUCCESS_CACHE_MS;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const fingerprint = makeFingerprint(input, init);
  const existing = operationCache.get(fingerprint);

  cleanupExpired(now);

  if (existing) {
    if (existing.status === 'pending') {
      sendMetric('idempotent_duplicate_pending', 1);
      return existing.promise as Promise<T>;
    }

    if (existing.status === 'success' && now - existing.timestamp < successCacheMs) {
      sendMetric('idempotent_duplicate_cached', 1);
      return existing.result as T;
    }
  }

  const method = (init.method ?? 'GET').toUpperCase();
  const idempotencyKey = getOrCreateRequestId(fingerprint, ttlMs);
  const headers = new Headers(init.headers);
  headers.set('X-Request-Id', idempotencyKey);
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('Idempotency-Key', idempotencyKey);
  }

  const promise = fetch(input, { ...init, method, headers })
    .then(async (response) => {
      const result = (await response.json()) as T;
      const record = operationCache.get(fingerprint);
      if (record) {
        record.status = 'success';
        record.result = result;
        record.timestamp = Date.now();
      }
      return result;
    })
    .catch((error) => {
      operationCache.delete(fingerprint);
      removeSharedRequestId(fingerprint);
      getBroadcastChannel()?.postMessage({ type: 'CLEAR_REQUEST_ID', operationKey: fingerprint });
      throw error;
    });

  operationCache.set(fingerprint, {
    status: 'pending',
    timestamp: now,
    promise,
    idempotencyKey,
  });

  return promise;
}

export function clearIdempotentRequestState(): void {
  operationCache.clear();
  broadcastChannel?.close();
  broadcastChannel = null;
}
