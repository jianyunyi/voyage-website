import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOME_FIELD_NOTES_DURATION,
  HOME_FIELD_NOTES_FPS,
} from './HomeFieldNotes';

test('field notes uses a twelve-second 30fps timeline', () => {
  assert.equal(HOME_FIELD_NOTES_FPS, 30);
  assert.equal(HOME_FIELD_NOTES_DURATION, 360);
});
