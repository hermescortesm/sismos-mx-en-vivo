import { test } from "node:test";
import assert from "node:assert/strict";
import { isQuakeList, normalizeFeature, parseFeed } from "./usgs.ts";
import { assignRegion, inMexicoBbox } from "./regions.ts";
import { applyFilters, byMag, byDepth, byRegion, byTime, byWindow } from "./filters.ts";
import type { Filters, Quake } from "./usgs.ts";

const feat = (id: string, lon: number, lat: number, mag: number | null = 4, time = 1000) => ({
  id,
  properties: { mag, place: "x", time, url: "https://u/" + id },
  geometry: { coordinates: [lon, lat, 10] },
});

const q = (o: Partial<Quake> = {}): Quake => ({
  id: "a", mag: 4, depthKm: 10, place: "", time: 1000, lon: -99, lat: 19, url: "", region: "centro", ...o,
});

test("normalizeFeature maps fields and region", () => {
  assert.deepEqual(normalizeFeature(feat("e1", -99.1, 16.8, 5.2, 42)), {
    id: "e1", mag: 5.2, depthKm: 10, place: "x", time: 42, lon: -99.1, lat: 16.8, url: "https://u/e1", region: "sur",
  });
});

test("normalizeFeature rejects incomplete features", () => {
  assert.equal(normalizeFeature(feat("e1", -99, 17, null)), null);
  assert.equal(normalizeFeature({ id: "x", properties: {}, geometry: { coordinates: [1] } }), null);
  assert.equal(normalizeFeature({}), null);
});

test("parseFeed clips to bbox, drops invalid, sorts newest first", () => {
  const out = parseFeed({
    features: [feat("old", -99, 19, 3, 1), feat("outside", -120, 19), feat("bad", -99, 19, null), feat("new", -99, 19, 3, 9)],
  });
  assert.deepEqual(out.map((x) => x.id), ["new", "old"]);
  assert.throws(() => parseFeed({}));
});

test("bbox edges are inclusive", () => {
  assert.ok(inMexicoBbox(-118.5, 14) && inMexicoBbox(-86, 33));
  assert.ok(!inMexicoBbox(-118.6, 20) && !inMexicoBbox(-100, 33.1));
});

test("assignRegion", () => {
  assert.equal(assignRegion(-99.9, 16.8), "sur"); // Guerrero coast
  assert.equal(assignRegion(-93, 15.5), "sur"); // Chiapas coast
  assert.equal(assignRegion(-104.3, 19.0), "occ"); // Colima
  assert.equal(assignRegion(-112, 28), "golfo"); // Gulf of California
  assert.equal(assignRegion(-110, 23), "golfo"); // Baja Sur
  assert.equal(assignRegion(-97.5, 19), "centro"); // Veracruz/Puebla
  assert.equal(assignRegion(-92, 22), "centro"); // Gulf of Mexico
});

test("range predicates are inclusive", () => {
  assert.ok(byMag(q({ mag: 4 }), [4, 5]) && !byMag(q({ mag: 3.9 }), [4, 5]));
  assert.ok(byDepth(q({ depthKm: 100 }), [0, 100]) && !byDepth(q({ depthKm: 101 }), [0, 100]));
});

test("byRegion, byTime, byWindow", () => {
  assert.ok(byRegion(q({ region: "sur" }), "todas") && byRegion(q({ region: "sur" }), "sur"));
  assert.ok(!byRegion(q({ region: "sur" }), "occ"));
  assert.ok(byTime(q({ time: 5 }), [new Date(5), new Date(6)]) && !byTime(q({ time: 7 }), [new Date(5), new Date(6)]));
  assert.ok(byWindow(q(), null) && !byWindow(q({ time: 1 }), [new Date(5), new Date(6)]));
});

test("applyFilters combines every filter", () => {
  const f: Filters = {
    mag: [3, 6], depthKm: [0, 50], dates: [new Date(0), new Date(100)], region: "sur", window: [new Date(10), new Date(50)],
  };
  const keep = q({ id: "k", region: "sur", time: 20 });
  const rest = [
    q({ id: "mag", region: "sur", time: 20, mag: 7 }),
    q({ id: "depth", region: "sur", time: 20, depthKm: 60 }),
    q({ id: "region", region: "occ", time: 20 }),
    q({ id: "dates", region: "sur", time: 200 }),
    q({ id: "window", region: "sur", time: 60 }),
  ];
  assert.deepEqual(applyFilters([keep, ...rest], f).map((x) => x.id), ["k"]);
});

test("isQuakeList accepts parsed feeds and rejects anything else", () => {
  assert.equal(isQuakeList(parseFeed({ features: [feat("a", -99, 17)] })), true);
  assert.equal(isQuakeList([]), true);
  assert.equal(isQuakeList({ error: "x" }), false);
  assert.equal(isQuakeList(null), false);
  assert.equal(isQuakeList([null]), false);
  assert.equal(isQuakeList([{ ...q(), mag: "4" }]), false);
  assert.equal(isQuakeList([{ ...q(), region: "mars" }]), false);
  assert.equal(isQuakeList([{ ...q(), lat: NaN }]), false);
});
