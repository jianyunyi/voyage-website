import assert from 'node:assert/strict';
import test from 'node:test';
import { canPlanRoute } from './mapPlannerState';

test('canPlanRoute requires a ready map and two distinct selected cities', () => {
  assert.equal(canPlanRoute({ origin: '', destination: 'c4', mapReady: true }), false);
  assert.equal(canPlanRoute({ origin: 'c1', destination: '', mapReady: true }), false);
  assert.equal(canPlanRoute({ origin: 'c1', destination: 'c1', mapReady: true }), false);
  assert.equal(canPlanRoute({ origin: 'c1', destination: 'c4', mapReady: false }), false);
  assert.equal(canPlanRoute({ origin: 'c1', destination: 'c4', mapReady: true }), true);
});
