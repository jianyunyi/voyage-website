import assert from 'node:assert/strict';
import test from 'node:test';
import { clearIdempotentRequestState, idempotentJson } from './idempotentFetch';

test('deduplicates concurrent identical GET requests into one network call', async () => {
  clearIdempotentRequestState();
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new Response(JSON.stringify({ success: true, calls }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const [first, second] = await Promise.all([
      idempotentJson<{ success: true; calls: number }>('/api/guides'),
      idempotentJson<{ success: true; calls: number }>('/api/guides'),
    ]);

    assert.equal(calls, 1);
    assert.deepEqual(first, { success: true, calls: 1 });
    assert.deepEqual(second, { success: true, calls: 1 });
  } finally {
    globalThis.fetch = originalFetch;
    clearIdempotentRequestState();
  }
});

test('deduplicates concurrent identical POST requests and attaches an idempotency key', async () => {
  clearIdempotentRequestState();
  let calls = 0;
  const keys: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const headers = new Headers(init?.headers);
    keys.push(headers.get('Idempotency-Key') ?? '');
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const payload = { title: 'Chengdu guide', timestamp: 123 };
    await Promise.all([
      idempotentJson('/api/guides/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      idempotentJson('/api/guides/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, timestamp: 456 }),
      }),
    ]);

    assert.equal(calls, 1);
    assert.equal(keys.length, 1);
    assert.match(keys[0], /^[a-z0-9-]+$/i);
  } finally {
    globalThis.fetch = originalFetch;
    clearIdempotentRequestState();
  }
});
