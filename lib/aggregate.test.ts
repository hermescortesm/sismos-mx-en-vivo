import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregatePacked, pack, toBins, toStats } from "./aggregate.ts";
import { aggregateBins } from "./d3/timeline.ts";
import { computeStats } from "./stats.ts";
import type { Quake } from "./quakes.ts";

const HOUR = 3_600_000;
const now = Date.UTC(2026, 10, 5, 20, 0, 0);
const domain: [Date, Date] = [new Date(now - 24 * HOUR), new Date(now)];

// Small deterministic generator, so the check is repeatable.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function synthetic(n: number, seed = 7): Quake[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    mag: Math.round((2 + r() * 5) * 10) / 10,
    depthKm: Math.round(r() * 650),
    place: `lugar ${i}, Oax.`,
    time: now - Math.floor(r() * 26 * HOUR) + 2 * HOUR, // some outside the domain
    lon: -100,
    lat: 17,
    url: "",
    region: "sur" as const,
  }));
}

function bothPaths(base: Quake[], visible: Quake[]) {
  const agg = aggregatePacked(pack(base), pack(visible), [+domain[0], +domain[1]], now);
  return {
    bins: toBins(agg.bins, +domain[0]),
    stats: toStats(agg.stats, visible, 99, now),
  };
}

test("packed path equals the pure functions on a small set", () => {
  const base = synthetic(500);
  const visible = base.filter((q) => q.mag >= 4);
  const got = bothPaths(base, visible);
  assert.deepEqual(got.bins, aggregateBins(base, domain));
  assert.deepEqual(got.stats, computeStats(visible, 99, now));
});

test("empty input matches too", () => {
  const got = bothPaths([], []);
  assert.deepEqual(got.bins, aggregateBins([], domain));
  assert.deepEqual(got.stats, computeStats([], 99, now));
  assert.equal(got.bins.length, 24);
});

test("stress: 20 000 synthetic quakes aggregate identically and fast", () => {
  const base = synthetic(20_000);
  const visible = base.filter((q) => q.depthKm < 300);
  const t0 = performance.now();
  const got = bothPaths(base, visible);
  const ms = performance.now() - t0;
  assert.deepEqual(got.bins, aggregateBins(base, domain));
  assert.deepEqual(got.stats, computeStats(visible, 99, now));
  // On the main thread this would be a visible stall at 60 fps; the worker keeps it off the UI thread.
  assert.ok(ms < 1000, `aggregation took ${ms.toFixed(0)} ms`);
  console.log(`# 20 000 quakes: pack + aggregate + unpack ${ms.toFixed(1)} ms`);
});
