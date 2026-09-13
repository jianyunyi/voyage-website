import assert from 'node:assert/strict';
import test from 'node:test';
import { clearIdempotentRequestState } from './idempotentFetch';
import { fetchPublishedGuides } from './guideService';
import { fetchPublishedFoods } from './foodService';

test('uses editorial guide presets when the published guide response is empty', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, guides: [] }));

  try {
    const guides = await fetchPublishedGuides();
    assert.ok(guides.length > 0);
    assert.equal(guides[0].source, 'admin');
  } finally {
    globalThis.fetch = originalFetch;
    clearIdempotentRequestState();
  }
});

test('uses editorial food presets when the published food request fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };

  try {
    const foods = await fetchPublishedFoods();
    assert.ok(foods.length > 0);
    assert.equal(foods[0].source, 'admin');
  } finally {
    globalThis.fetch = originalFetch;
    clearIdempotentRequestState();
  }
});
