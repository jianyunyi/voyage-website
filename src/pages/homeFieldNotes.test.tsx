import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeHeroMedia } from "./Home";
import { getSceneForPath } from "../lib/experience/sceneCatalog";
import { readFileSync } from "node:fs";

test("homepage field-notes media has a poster and metadata preload", () => {
  const html = renderToStaticMarkup(
    createElement(HomeHeroMedia, {
      scene: getSceneForPath("/"),
      destinationImageSrc: "/destination-photo.jpg",
    }),
  );

  assert.match(html, /home-field-notes\.mp4/);
  assert.match(html, /home-field-notes-poster\.png/);
  assert.match(html, /preload="metadata"/);
  assert.match(html, /class="home-field-notes-media__video absolute inset-0 h-full w-full object-cover opacity-16"/);
});

test("homepage field-notes media keeps the destination visual context", () => {
  const html = renderToStaticMarkup(
    createElement(HomeHeroMedia, {
      scene: getSceneForPath("/"),
      destinationImageSrc: "/destination-photo.jpg",
    }),
  );

  assert.match(html, /destination-photo\.jpg/);
});

test("homepage carousel gives each location a longer dwell time and image fallback", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  assert.match(source, /HERO_ROTATION_INTERVAL = 9000/);
  assert.match(source, /onError=\{handleImageError\}/);
});
