import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomFilter } from "./zoomFilter.ts";

test("plain wheel is ignored, ctrl or cmd wheel (and pinch) zooms", () => {
  assert.equal(zoomFilter({ type: "wheel" }), false);
  assert.equal(zoomFilter({ type: "wheel", ctrlKey: true }), true);
  assert.equal(zoomFilter({ type: "wheel", metaKey: true }), true);
});

test("primary-button drag pans, other buttons do not", () => {
  assert.equal(zoomFilter({ type: "mousedown", button: 0 }), true);
  assert.equal(zoomFilter({ type: "mousedown", button: 2 }), false);
  assert.equal(zoomFilter({ type: "mousedown", button: 0, ctrlKey: true }), false);
});

test("one finger scrolls the page, two fingers reach the map", () => {
  assert.equal(zoomFilter({ type: "touchstart", touches: { length: 1 } }), false);
  assert.equal(zoomFilter({ type: "touchstart", touches: { length: 2 } }), true);
});
