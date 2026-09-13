import assert from 'node:assert/strict';
import test from 'node:test';
import { getSceneForPath } from './sceneCatalog';

test('home uses the field-notes video and dedicated poster fallback', () => {
  assert.deepEqual(getSceneForPath('/'), {
    videoSrc: '/motion/home-field-notes.mp4',
    posterSrc: '/motion/home-field-notes-poster.png',
    tone: 'home',
  });
});

test('planner selects the route terrain scene and poster fallback', () => {
  assert.deepEqual(getSceneForPath('/planner'), {
    videoSrc: '/motion/route-terrain.mp4',
    posterSrc: '/motion/route-terrain-poster.png',
    tone: 'planner',
  });
});

test('an unknown path uses the Field Notes home fallback instead of no backdrop', () => {
  assert.equal(getSceneForPath('/unknown').tone, 'home');
});

test('catalog covers every supported page tone', () => {
  assert.equal(getSceneForPath('/').tone, 'home');
  assert.equal(getSceneForPath('/guides/42').tone, 'guides');
  assert.equal(getSceneForPath('/food').tone, 'guides');
  assert.equal(getSceneForPath('/compare').tone, 'compare');
  assert.equal(getSceneForPath('/hotel/42').tone, 'compare');
  assert.equal(getSceneForPath('/profile').tone, 'profile');
  assert.equal(getSceneForPath('/auth').tone, 'profile');
});
