import { test } from "node:test";
import assert from "node:assert/strict";
import { feedKind, filtersSummary } from "./feedState.ts";
import type { Filters } from "./usgs.ts";

const base = { status: "live" as const, hasData: true, total: 40, visible: 12 };

test("first load shows loading until data arrives", () => {
  assert.equal(feedKind({ ...base, status: "loading", hasData: false, total: 0, visible: 0 }), "loading");
  // Paused before the first batch: no request is pending, so no spinner.
  assert.equal(feedKind({ ...base, status: "paused", hasData: false, total: 0, visible: 0 }), null);
});

test("error wins, with or without previous data", () => {
  assert.equal(feedKind({ ...base, status: "error" }), "error");
  assert.equal(feedKind({ ...base, status: "error", hasData: false, total: 0, visible: 0 }), "error");
});

test("empty feed vs empty after filtering vs normal", () => {
  assert.equal(feedKind({ ...base, total: 0, visible: 0 }), "empty");
  assert.equal(feedKind({ ...base, visible: 0 }), "filtered-empty");
  assert.equal(feedKind(base), null);
  assert.equal(feedKind({ ...base, status: "paused" }), null);
});

test("filtersSummary lists only active constraints", () => {
  const f: Filters = { mag: [6, 8], depthKm: [0, 700], dates: [new Date(0), new Date(1)], region: "occ", window: null };
  assert.equal(filtersSummary(f), "M ≥ 6.0, Occidente");
  assert.equal(
    filtersSummary({ ...f, mag: [3, 5], depthKm: [10, 100], region: "todas", window: [new Date(0), new Date(1)] }),
    "M 3.0–5.0, 10–100 km, periodo acotado",
  );
});
