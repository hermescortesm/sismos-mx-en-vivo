import { test } from "node:test";
import assert from "node:assert/strict";
import { createHitTester, formatQuake, magBucket, placeTooltip } from "./tooltip.ts";
import type { Quake } from "../usgs.ts";

const q = (id: string, o: Partial<Quake> = {}): Quake => ({
  id, mag: 4.62, depthKm: 10.4, place: "p", time: Date.UTC(2026, 10, 5, 20, 32, 10), lon: 0, lat: 0, url: "", region: "sur", ...o,
});

const box = { w: 260, h: 150 };
const area = { w: 600, h: 400 };

test("placeTooltip goes above by default and stays clear of the anchor", () => {
  const p = placeTooltip({ x: 300, y: 300, r: 10 }, box, area);
  assert.equal(p.side, "above");
  assert.ok(p.top + box.h <= 300 - 10 - 18);
  assert.equal(p.left, 170);
});

test("placeTooltip flips below near the top edge", () => {
  const p = placeTooltip({ x: 300, y: 60, r: 10 }, box, area);
  assert.equal(p.side, "below");
  assert.ok(p.top >= 60 + 10 + 18);
});

test("placeTooltip clamps horizontally at both edges", () => {
  assert.equal(placeTooltip({ x: 5, y: 300 }, box, area).left, 4);
  const right = placeTooltip({ x: 595, y: 300 }, box, area);
  assert.equal(right.left + box.w, area.w - 4);
});

function overlapsCircle(p: { left: number; top: number }, b: { w: number; h: number }, a: { x: number; y: number; r: number }) {
  const nx = Math.max(p.left, Math.min(a.x, p.left + b.w));
  const ny = Math.max(p.top, Math.min(a.y, p.top + b.h));
  return Math.hypot(a.x - nx, a.y - ny) < a.r;
}

test("placeTooltip never covers the anchor circle, even on small maps", () => {
  for (const area of [{ w: 468, h: 289 }, { w: 356, h: 220 }, { w: 300, h: 150 }]) {
    for (let x = 0; x <= area.w; x += 12) {
      for (let y = 0; y <= area.h; y += 12) {
        for (const r of [2, 10, 26]) {
          const p = placeTooltip({ x, y, r }, box, area);
          assert.equal(overlapsCircle(p, box, { x, y, r }), false, `${area.w}x${area.h} at ${x},${y} r=${r}`);
        }
      }
    }
  }
});

test("placeTooltip extends past the container edge when nothing fits", () => {
  const p = placeTooltip({ x: 230, y: 140, r: 10 }, box, { w: 468, h: 289 });
  assert.ok(p.side === "above" || p.side === "below");
  assert.ok(p.top < 0 || p.top + box.h > 289);
});

test("placeTooltip goes beside the anchor when the container is too short", () => {
  const short = { w: 600, h: 180 };
  assert.equal(placeTooltip({ x: 100, y: 90 }, box, short).side, "right");
  const left = placeTooltip({ x: 560, y: 90 }, box, short);
  assert.equal(left.side, "left");
  assert.ok(left.left + box.w <= 560 - 18);
});

test("hit tester returns the nearest point within the radius", () => {
  const t = createHitTester([
    { x: 10, y: 10, q: q("a") },
    { x: 50, y: 50, q: q("b") },
  ]);
  assert.equal(t.find(12, 11, 5)?.id, "a");
  assert.equal(t.find(48, 52, 5)?.id, "b");
  assert.equal(t.find(30, 30, 5), null);
  assert.equal(createHitTester([]).find(0, 0, 100), null);
});

test("formatQuake builds es-MX texts", () => {
  const now = Date.UTC(2026, 10, 5, 20, 52, 10);
  assert.deepEqual(formatQuake(q("a"), now), { mag: "M 4.6", depth: "10 km", time: "05/11/2026 14:32", relative: "hace 20 min" });
  assert.equal(formatQuake(q("a"), now + 3 * 3_600_000).relative, "hace 3 h");
  assert.equal(formatQuake(q("a"), now - 19 * 60_000).relative, "hace 1 min");
  assert.equal(formatQuake(q("a"), now + 2 * 86_400_000).relative, "hace 2 d");
});

test("magBucket edges", () => {
  assert.deepEqual([2.9, 3, 3.9, 4, 5, 6].map(magBucket), [0, 1, 1, 2, 3, 4]);
});

test("magBucket agrees with the displayed one-decimal magnitude", () => {
  assert.equal(formatQuake(q("a", { mag: 2.96 }), 0).mag, "M 3.0");
  assert.equal(magBucket(2.96), 1);
  assert.equal(magBucket(3.95), 2);
  assert.equal(magBucket(2.94), 0);
  assert.equal(magBucket(5.96), 4);
});
