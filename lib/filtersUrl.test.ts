import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultFilters, filtersFromParams, filtersToParams, fromDateInput, isDefaultDates, isDefaultFilters, toDateInput } from "./filtersUrl.ts";
import type { Filters } from "./usgs.ts";

const now = new Date(2026, 10, 5, 14, 32);
const parse = (qs: string) => filtersFromParams(new URLSearchParams(qs), now);

test("empty params give defaults", () => {
  assert.deepEqual(parse(""), defaultFilters(now));
  assert.deepEqual(defaultFilters(now).dates, [new Date(2026, 10, 4), new Date(2026, 10, 5, 23, 59, 59, 999)]);
});

test("filters survive a params round trip", () => {
  const f: Filters = {
    mag: [3.5, 7],
    depthKm: [10, 300],
    dates: [new Date(2026, 10, 3), new Date(2026, 10, 5, 23, 59, 59, 999)],
    region: "sur",
    window: [new Date(1000), new Date(5000)],
  };
  assert.deepEqual(parse(filtersToParams(f).toString()), f);
});

test("todas and null window are omitted from the URL", () => {
  const p = filtersToParams(defaultFilters(now));
  assert.equal(p.has("region"), false);
  assert.equal(p.has("w"), false);
});

test("out-of-range values are clamped, bad values fall back", () => {
  assert.deepEqual(parse("mag=0-99").mag, [2, 8]);
  assert.deepEqual(parse("depth=500-100").depthKm, [0, 700]);
  assert.deepEqual(parse("mag=abc").mag, [2.5, 8]);
  assert.equal(parse("region=mars").region, "todas");
  assert.equal(parse("w=9-3").window, null);
  assert.deepEqual(parse("from=2026-11-05&to=2026-11-01").dates, defaultFilters(now).dates);
  assert.deepEqual(parse("from=2026-02-31&to=2026-03-01").dates, defaultFilters(now).dates);
});

test("date input helpers use local days", () => {
  assert.equal(toDateInput(new Date(2026, 0, 9)), "2026-01-09");
  assert.equal(fromDateInput("2026-13-01"), null);
  assert.deepEqual(fromDateInput("2026-01-09"), new Date(2026, 0, 9));
});

test("isDefaultFilters", () => {
  assert.equal(isDefaultFilters(defaultFilters(now), now), true);
  assert.equal(isDefaultFilters({ ...defaultFilters(now), mag: [3, 8] }, now), false);
  assert.equal(isDefaultFilters({ ...defaultFilters(now), region: "sur" }, now), false);
  assert.equal(isDefaultFilters(parse(""), now), true);
});

test("off-step URL values snap to the slider step", () => {
  assert.deepEqual(parse("depth=33-71").depthKm, [35, 70]);
  assert.deepEqual(parse("mag=2.56-5.04").mag, [2.6, 5]);
  assert.deepEqual(parse("depth=31-32").depthKm, [0, 700]); // both snap to 30: falls back
});

test("isDefaultDates", () => {
  assert.equal(isDefaultDates(defaultFilters(now).dates, now), true);
  assert.equal(isDefaultDates([new Date(2026, 10, 1), new Date(2026, 10, 5, 23, 59)], now), false);
});
