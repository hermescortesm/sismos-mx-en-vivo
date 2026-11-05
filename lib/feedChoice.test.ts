import { test } from "node:test";
import assert from "node:assert/strict";
import type { Filters } from "./usgs.ts";
import { feedForFilters, feedForRange, parseFeedParam } from "./feedChoice.ts";
import { defaultFilters, endOfDay, startOfDay } from "./filtersUrl.ts";

const DAY = 86_400_000;
const range = (days: number): [Date, Date] => [new Date(0), new Date(days * DAY)];

test("range picks the smallest feed that covers it", () => {
  assert.equal(feedForRange(range(1)), "all_day");
  assert.equal(feedForRange([new Date(0), new Date(DAY - 1)]), "all_day");
  assert.equal(feedForRange(range(2)), "all_week");
  assert.equal(feedForRange(range(7)), "all_week");
  assert.equal(feedForRange(range(8)), "all_month");
  assert.equal(feedForRange(range(30)), "all_month");
});

test("feed query parameter is whitelisted", () => {
  assert.equal(parseFeedParam(null), "all_day");
  assert.equal(parseFeedParam("all_week"), "all_week");
  assert.equal(parseFeedParam("all_month"), "all_month");
  assert.equal(parseFeedParam("../../etc"), undefined);
  assert.equal(parseFeedParam(""), undefined);
  assert.equal(parseFeedParam("ALL_DAY"), undefined);
});

const now = new Date(2026, 10, 5, 14, 32);

test("feedForFilters: default filters use all_day", () => {
  assert.equal(feedForFilters(defaultFilters(now), now), "all_day");
});

test("feedForFilters: the hour presets use all_day, early morning and afternoon alike", () => {
  // The presets set dates [start of day(now - N h), end of day(now)].
  for (const at of [new Date(2026, 10, 5, 14, 32), new Date(2026, 10, 5, 1, 10)]) {
    for (const hours of [1, 6, 12, 24]) {
      const from = new Date(at.getTime() - hours * 3_600_000);
      const f = { ...defaultFilters(at), dates: [startOfDay(from), endOfDay(at)] as [Date, Date] };
      assert.equal(feedForFilters(f, at), "all_day", `${hours} h at ${at.getHours()}:00`);
    }
  }
});

test("feedForFilters: explicit ranges follow the span rule", () => {
  const range = (days: number): Filters => ({
    ...defaultFilters(now),
    dates: [new Date(2026, 10, 5 - days + 1), endOfDay(now)],
  });
  assert.equal(feedForFilters(range(3), now), "all_week");
  assert.equal(feedForFilters(range(7), now), "all_week");
  assert.equal(feedForFilters(range(20), now), "all_month");
  assert.equal(feedForFilters({ ...defaultFilters(now), dates: [startOfDay(now), endOfDay(now)] }, now), "all_day");
});
