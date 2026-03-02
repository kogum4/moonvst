import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const buildWorkflow = readFileSync(".github/workflows/build.yml", "utf8");
const testWorkflow = readFileSync(".github/workflows/test.yml", "utf8");
const setupWindows = readFileSync("scripts/setup-windows.ps1", "utf8");
const setupMacos = readFileSync("scripts/setup-macos.sh", "utf8");

assert.match(
  buildWorkflow,
  /concurrency:\s*[\s\S]*cancel-in-progress:\s*true/m,
  "build workflow must cancel stale in-progress runs",
);

assert.match(
  buildWorkflow,
  /selected_products/,
  "build workflow must compute selected products for PR vs main",
);

assert.match(
  buildWorkflow,
  /needs\.discover-products\.outputs\.selected_products/,
  "build and artifact tests must use selected_products",
);

assert.match(
  buildWorkflow,
  /paths-ignore:\s*[\s\S]*\*\*\/\*\.md/m,
  "build workflow should skip docs-only changes",
);

assert.match(
  testWorkflow,
  /paths-ignore:\s*[\s\S]*\*\*\/\*\.md/m,
  "test workflow should skip docs-only changes",
);

assert.match(
  testWorkflow,
  /Run UI E2E tests[\s\S]*if:\s*github\.event_name\s*!=\s*'pull_request'/m,
  "UI E2E should be skipped on pull requests",
);

assert.match(
  setupWindows,
  /\$env:GITHUB_ACTIONS[\s\S]*npm ci[\s\S]*else[\s\S]*npm install/m,
  "windows setup should use npm ci under CI",
);

assert.match(
  setupMacos,
  /GITHUB_ACTIONS[\s\S]*npm ci[\s\S]*else[\s\S]*npm install/m,
  "macOS setup should use npm ci under CI",
);

console.log("CI workflow policy checks passed");
