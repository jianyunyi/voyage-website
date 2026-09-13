import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("planner initializes the AMap satellite terrain presentation", () => {
  const source = readFileSync(new URL("./MapPlanner.tsx", import.meta.url), "utf8");

  assert.match(source, /const SatelliteLayer = AMap\.TileLayer\.Satellite/);
  assert.match(source, /const RoadNetLayer = AMap\.TileLayer\.RoadNet/);
  assert.match(source, /layers: \[new SatelliteLayer\(\), new RoadNetLayer\(\)\]/);
  assert.match(source, /viewMode: '3D'/);
  assert.match(source, /pitch: 42/);
});

test("planner has a dedicated terrain workbench style", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

  assert.match(css, /\.voyage-planner--terrain/);
  assert.match(css, /\.voyage-planner__planning-panel/);
  assert.match(css, /\.voyage-planner__tool-rail/);
});
