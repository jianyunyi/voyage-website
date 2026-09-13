import assert from 'node:assert/strict';
import test from 'node:test';
import { nextSelection } from './selectionNavigation';

test('moves a selectable highlight forward and wraps at the end', () => {
  assert.equal(nextSelection(['hotel', 'transport', 'car'], 'car', 1), 'hotel');
});

test('moves a selectable highlight backward and wraps at the beginning', () => {
  assert.equal(nextSelection(['hotel', 'transport', 'car'], 'hotel', -1), 'car');
});
