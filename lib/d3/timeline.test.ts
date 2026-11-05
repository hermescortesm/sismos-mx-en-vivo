import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateBins, clampWindow, hourTicks, tickLabel, windowLabel } from "./timeline.ts";
import type { Quake } from "../quakes.ts";

const H = 3_600_000;
const start = Date.UTC(2026, 10, 5, 0, 0, 0);
const domain: [Date, Date] = [new Date(start), new Date(start + 24 * H)];
const q = (time: number): Quake => ({ id: String(time), mag: 3, depthKm: 5, place: "", time, lon: 0, lat: 0, url: "", region: "sur" });

test("empty input gives 24 zero bins", () => {
  const bins = aggregateBins([], domain);
  assert.equal(bins.length, 24);
  assert.ok(bins.every((b) => b.count === 0));
  assert.equal(+bins[0].start, start);
  assert.equal(+bins[23].start, start + 23 * H);
});

test("bin boundaries: start inclusive, end belongs to the last bin", () => {
  const bins = aggregateBins([q(start), q(start + H - 1), q(start + H), q(start + 24 * H)], domain);
  assert.deepEqual([bins[0].count, bins[1].count, bins[23].count], [2, 1, 1]);
});

test("events outside the domain are ignored", () => {
  const bins = aggregateBins([q(start - 1), q(start + 24 * H + 1)], domain);
  assert.equal(bins.reduce((n, b) => n + b.count, 0), 0);
});

test("clampWindow keeps the window inside the domain", () => {
  const w = clampWindow([new Date(start - 5 * H), new Date(start + 2 * H)], domain);
  assert.deepEqual(w, [domain[0], new Date(start + 2 * H)]);
  assert.equal(clampWindow(null, domain), null);
  assert.equal(clampWindow([new Date(start + 30 * H), new Date(start + 31 * H)], domain), null);
  assert.equal(clampWindow([new Date(start + 2 * H), new Date(start + 2 * H)], domain), null);
});

test("hourTicks every 3 h, labelled in Mexico City time", () => {
  const ticks = hourTicks([new Date(start + 1 * H), new Date(start + 10 * H)]);
  assert.deepEqual(ticks.map((t) => +t - start), [3 * H, 6 * H, 9 * H]);
  assert.equal(tickLabel(new Date(start + 6 * H)), "00:00");
  assert.equal(tickLabel(new Date(start + 9 * H)), "03:00");
});

test("windowLabel", () => {
  assert.equal(windowLabel(null), "24 h completas");
  assert.equal(windowLabel([new Date(start + 8 * H), new Date(start + 14 * H + 30 * 60_000)]), "02:00 – 08:30");
});
