import { test } from "node:test";
import assert from "node:assert/strict";
import { depthColor, magColor, radius } from "./scales.ts";

test("radius endpoints and clamping", () => {
  assert.equal(radius(2.5), 2);
  assert.equal(radius(8), 26);
  assert.equal(radius(1), 2);
  assert.equal(radius(9.5), 26);
  assert.ok(radius(3) < radius(4) && radius(4) < radius(6));
});

test("depthColor thresholds are lower-inclusive", () => {
  const c = depthColor("dark");
  assert.equal(c(0), "#a5ecff");
  assert.equal(c(32.9), "#a5ecff");
  assert.equal(c(33), "#4cc3f5");
  assert.equal(c(70), "#3b8df0");
  assert.equal(c(150), "#6f6cf0");
  assert.equal(c(299.9), "#6f6cf0");
  assert.equal(c(300), "#a46cf2");
});

test("magColor thresholds", () => {
  const c = magColor("light");
  assert.deepEqual([2.9, 3, 4, 5, 6, 7.5].map(c), ["#6e7781", "#e1a60f", "#e0782b", "#d1242f", "#a40e26", "#a40e26"]);
});

test("themes use different ramps", () => {
  assert.notEqual(depthColor("dark")(10), depthColor("light")(10));
  assert.notEqual(magColor("dark")(4.5), magColor("light")(4.5));
});
