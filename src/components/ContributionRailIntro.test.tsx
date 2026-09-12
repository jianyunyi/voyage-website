import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContributionRailIntro } from "./ContributionRailIntro";

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
  assert.match(html, /精选旅行攻略/);
});
