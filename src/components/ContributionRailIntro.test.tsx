import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContributionRailIntro } from "./ContributionRailIntro";

test("reduced motion hides the Field Notes video while retaining its poster", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.home-field-notes-media__video\s*\{\s*display: none;/,
  );
});

test("contribution intro anchors title, action, and search content to one rail", () => {
  const html = renderToStaticMarkup(
    createElement(
      ContributionRailIntro,
      {
        title: "精选旅行攻略",
        description: "真实行程",
        action: createElement("button", null, "发布攻略"),
        children: "搜索",
      },
    ),
  );

  assert.match(html, /voyage-contribution-rail/);
  assert.match(html, /voyage-contribution-rail__action/);
  assert.match(html, /发布攻略/);
  assert.match(html, /voyage-contribution-rail__search/);
  assert.match(html, /搜索/);
  assert.match(html, /精选旅行攻略/);
});

test("contribution rail switches layouts at the md breakpoint", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

  assert.match(
    css,
    /@media \(min-width: 768px\) \{[\s\S]*?\.voyage-contribution-rail__heading\s*\{[\s\S]*?flex-direction: row;/,
  );
  assert.match(
    css,
    /@media \(max-width: 767px\) \{[\s\S]*?\.voyage-contribution-rail__action > \*\s*\{\s*inline-size: 100%;/,
  );
});
