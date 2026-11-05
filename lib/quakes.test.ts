import { test } from "node:test";
import assert from "node:assert/strict";
import { isQuakeList, normalizeFeature, parseFeed } from "./quakes.ts";
import { assignRegion, inMexicoBbox } from "./regions.ts";
import { applyFilters, byMag, byDepth, byRegion, byTime, byWindow } from "./filters.ts";
import { emscFeature as feat } from "./emscFixture.ts";
import type { Filters, Quake } from "./quakes.ts";

const q = (o: Partial<Quake> = {}): Quake => ({
  id: "a", mag: 4, depthKm: 10, place: "", time: 1000, lon: -99, lat: 19, url: "", region: "centro", ...o,
});

test("normalizeFeature maps the EMSC fields", () => {
  const got = normalizeFeature(
    feat("20261105_0000184", -95.591, 18.978, { mag: 3.6, depth: 16.3, time: "2026-11-05T10:42:10.0Z", region: "OFFSHORE VERACRUZ, MEXICO" }),
  );
  assert.deepEqual(got, {
    id: "20261105_0000184",
    mag: 3.6,
    depthKm: 16.3,
    place: "Costa afuera de Veracruz",
    time: Date.UTC(2026, 10, 5, 10, 42, 10),
    lon: -95.591,
    lat: 18.978,
    url: "https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=20261105_0000184",
    region: "centro",
  });
});

test("times with 2 or 6 fractional digits parse; depth falls back to the geometry z value", () => {
  assert.equal(normalizeFeature(feat("a", -99, 17, { time: "2026-11-05T22:39:59.15Z" }))?.time, Date.UTC(2026, 10, 5, 22, 39, 59, 150));
  assert.equal(normalizeFeature(feat("a", -99, 17, { time: "2026-11-05T05:51:18.237435Z" }))?.time, Date.UTC(2026, 10, 5, 5, 51, 18, 237));
  const noDepthProp = feat("a", -99, 17);
  (noDepthProp.properties as { depth: unknown }).depth = undefined;
  assert.equal(normalizeFeature(noDepthProp)?.depthKm, 10); // z is -10
});

test("normalizeFeature rejects incomplete or invalid features", () => {
  assert.equal(normalizeFeature(feat("a", -99, 17, { mag: null })), null);
  assert.equal(normalizeFeature(feat("a", -99, 17, { depth: null })), null);
  assert.equal(normalizeFeature(feat("a", -99, 17, { time: "not a date" })), null);
  assert.equal(normalizeFeature(feat("a", NaN, 17)), null);
  const noId = feat("a", -99, 17);
  (noId.properties as { unid: unknown }).unid = undefined;
  (noId as { id: unknown }).id = undefined;
  assert.equal(normalizeFeature(noId), null);
  assert.equal(normalizeFeature({ id: "x", properties: {}, geometry: { coordinates: [1] } }), null);
  assert.equal(normalizeFeature({}), null);
});

test("parseFeed clips to bbox, drops invalid, sorts newest first", () => {
  const out = parseFeed({
    features: [
      feat("old", -99, 19, { time: "2026-11-05T01:00:00Z" }),
      feat("outside", -120, 19),
      feat("bad", -99, 19, { mag: null }),
      feat("new", -99, 19, { time: "2026-11-05T09:00:00Z" }),
    ],
  });
  assert.deepEqual(out.map((x) => x.id), ["new", "old"]);
  assert.throws(() => parseFeed({}));
});

test("parseFeed accepts the response of the live service shape", () => {
  assert.deepEqual(parseFeed({ type: "FeatureCollection", metadata: { count: 0 }, features: [] }), []);
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
