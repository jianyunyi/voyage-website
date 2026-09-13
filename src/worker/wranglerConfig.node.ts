import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Wrangler builds the Vite assets before uploading a Worker version", () => {
  const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as {
    build?: { command?: string };
  };

  assert.equal(config.build?.command, "npm run build");
});
