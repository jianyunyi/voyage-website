import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeHeroMedia } from "./Home";
import { getSceneForPath } from "../lib/experience/sceneCatalog";

test("homepage field-notes media has a poster and metadata preload", () => {
  const html = renderToStaticMarkup(
    createElement(HomeHeroMedia, { scene: getSceneForPath("/") }),
  );

  assert.match(html, /home-field-notes\.mp4/);
  assert.match(html, /home-field-notes-poster\.png/);
  assert.match(html, /preload="metadata"/);
});
