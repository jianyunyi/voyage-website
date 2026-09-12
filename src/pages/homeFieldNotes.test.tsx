import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeHeroMedia } from "./Home";
import { getSceneForPath } from "../lib/experience/sceneCatalog";

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
