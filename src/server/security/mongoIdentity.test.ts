import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOptionalObjectId } from './mongoIdentity';

test('normalizes a valid MongoDB ObjectId string for persistence', () => {
  const value = normalizeOptionalObjectId('507f1f77bcf86cd799439011');

  assert.equal(value?.toString(), '507f1f77bcf86cd799439011');
});

test('returns undefined for demo or malformed user ids', () => {
  assert.equal(normalizeOptionalObjectId('u1'), undefined);
  assert.equal(normalizeOptionalObjectId(''), undefined);
  assert.equal(normalizeOptionalObjectId(undefined), undefined);
});
