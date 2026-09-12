import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveBackdrop } from './ImmersiveBackdrop';

test('planner backdrop renders an immediate poster and decorative video enhancement', () => {
  const markup = renderToStaticMarkup(
    createElement(ImmersiveBackdrop, { pathname: '/planner' }),
  );

  assert.match(markup, /<div[^>]*aria-hidden="true"/);
  assert.match(markup, /<img[^>]*src="\/motion\/route-terrain-poster\.png"[^>]*alt=""/);
  assert.match(markup, /<video[^>]*muted=""[^>]*loop=""[^>]*playsinline=""[^>]*autoplay=""[^>]*preload="metadata"[^>]*poster="\/motion\/route-terrain-poster\.png"/);
  assert.match(markup, /<source[^>]*src="\/motion\/route-terrain\.mp4"[^>]*type="video\/mp4"/);
});

test('comparison backdrop uses its catalog video source and shared poster fallback', () => {
  const markup = renderToStaticMarkup(
    createElement(ImmersiveBackdrop, { pathname: '/compare' }),
  );

  assert.match(markup, /voyage-backdrop--compare/);
  assert.match(markup, /src="\/motion\/route-terrain-poster\.png"/);
  assert.match(markup, /src="\/motion\/compare-contours\.mp4"/);
});
