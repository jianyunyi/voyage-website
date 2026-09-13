import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOME_FIELD_NOTES_DURATION,
  HOME_FIELD_NOTES_FPS,
  getHomeFieldNotesPhase,
} from './HomeFieldNotes';

test('field notes uses a twelve-second 30fps timeline', () => {
  assert.equal(HOME_FIELD_NOTES_FPS, 30);
  assert.equal(HOME_FIELD_NOTES_DURATION, 360);
});

test('field notes keeps each scene within its assigned phase', () => {
  assert.equal(getHomeFieldNotesPhase(89), 'masthead');
  assert.equal(getHomeFieldNotesPhase(90), 'editorial');
  assert.equal(getHomeFieldNotesPhase(239), 'editorial');
  assert.equal(getHomeFieldNotesPhase(240), 'route');
});
