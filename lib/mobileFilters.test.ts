import { test } from "node:test";
import assert from "node:assert/strict";
import { DEPTH_CHIPS, MAG_CHIPS, activeDepthChip, activeMagChip, applyDepthChip, applyMagChip } from "./mobileFilters.ts";
import type { Filters } from "./usgs.ts";

const f: Filters = { mag: [2.5, 8], depthKm: [0, 700], dates: [new Date(0), new Date(1)], region: "todas", window: null };

test("magnitude chips set only the minimum", () => {
  const m4 = MAG_CHIPS.find((c) => c.id === "m4")!;
  assert.deepEqual(applyMagChip({ ...f, mag: [3, 6] }, m4), { mag: [4, 6] });
});

test("depth chips set the range", () => {
  assert.deepEqual(applyDepthChip(DEPTH_CHIPS[1]), { depthKm: [0, 70] });
  assert.deepEqual(applyDepthChip(DEPTH_CHIPS[3]), { depthKm: [300, 700] });
});

test("active chip detection", () => {
  assert.equal(activeMagChip(f), "all");
  assert.equal(activeMagChip({ ...f, mag: [2, 8] }), "all");
  assert.equal(activeMagChip({ ...f, mag: [3, 8] }), "m3");
  assert.equal(activeMagChip({ ...f, mag: [3.4, 8] }), null);
  assert.equal(activeMagChip({ ...f, mag: [4, 6] }), null);
  assert.equal(activeDepthChip(f), "all");
  assert.equal(activeDepthChip({ ...f, depthKm: [70, 300] }), "mid");
  assert.equal(activeDepthChip({ ...f, depthKm: [10, 300] }), null);
});
