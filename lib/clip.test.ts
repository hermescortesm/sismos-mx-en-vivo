import { test } from "node:test";
import assert from "node:assert/strict";
import borders from "../public/geo/mexico.topo.json" with { type: "json" };
import type { Topology } from "topojson-specification";
import { createClip, hasForeignLabel } from "./clip.ts";
import { emscFeature } from "./emscFixture.ts";
import { parseFeed } from "./quakes.ts";

const clip = createClip(borders as unknown as Topology);
const isForeign = (lon: number, lat: number) => clip.isForeign(lon, lat);

const dropped: [string, number, number][] = [
  ["Ocotillo, CA", -115.8, 32.7],
  ["Toyah, TX", -103.9, 31.3],
  ["Dilley, TX", -99.17, 28.67],
  ["New Mexico", -106.7, 32.2],
  ["Guatemala", -91.5, 15.0],
  ["Belize", -88.5, 17.2],
  ["Honduras", -87.2, 14.8],
];

const kept: [string, number, number][] = [
  ["Tijuana", -117.0, 32.5],
  ["Mexicali", -115.47, 32.6],
  ["Acapulco coast", -99.9, 16.85],
  ["Pacific off Guerrero", -100.5, 16.0],
  ["Gulf of California", -111.0, 27.0],
  ["Gulf of Mexico off Tamaulipas", -96.5, 24.0],
  ["Caribbean off Quintana Roo", -86.9, 19.5],
  ["Chiapas, Mexican side of the Guatemala border", -92.5, 15.2],
  ["Mexico City", -99.13, 19.43],
];

for (const [name, lon, lat] of dropped) {
  test(`dropped: ${name}`, () => assert.equal(isForeign(lon, lat), true));
}
for (const [name, lon, lat] of kept) {
  test(`kept: ${name}`, () => assert.equal(isForeign(lon, lat), false));
}

const feat = (id: string, lon: number, lat: number, minute: number, region?: string) =>
  emscFeature(id, lon, lat, { time: `2026-11-05T10:${String(minute).padStart(2, "0")}:00Z`, region });

test("parseFeed with the clip keeps Mexican land and sea, drops neighbours, and sorts newest first", () => {
  const feed = {
    features: [
      feat("ocotillo", -115.8, 32.7, 5, "SOUTHERN CALIFORNIA"),
      feat("clemente", -118.09, 32.6, 5, "SOUTHERN CALIFORNIA"), // US waters, dropped by name
      feat("tijuana", -117.0, 32.5, 4, "BAJA CALIFORNIA, MEXICO"),
      feat("texas", -104.139, 31.552, 3, "WESTERN TEXAS"),
      feat("acapulco", -99.9, 16.85, 2, "GUERRERO, MEXICO"),
      feat("guatemala", -90.102, 14.374, 1, "GUATEMALA"),
      feat("gulf", -111.0, 27.0, 6, "GULF OF CALIFORNIA"),
      feat("far-away", -150, 60, 7), // outside the bounding box
    ],
  };
  assert.deepEqual(parseFeed(feed, clip.isForeign).map((q) => q.id), ["gulf", "tijuana", "acapulco"]);
  // Without the clip function the old rectangle behaviour is unchanged.
  assert.deepEqual(parseFeed(feed).map((q) => q.id), ["gulf", "ocotillo", "clemente", "tijuana", "texas", "acapulco", "guatemala"]);
});

test("hasForeignLabel: US states and neighbours yes, Mexican and shared names no", () => {
  for (const l of ["SOUTHERN CALIFORNIA", "WESTERN TEXAS", "SOUTHERN TEXAS", "NEW MEXICO", "ARIZONA", "LOUISIANA", "OFFSHORE NORTHERN CALIFORNIA", "OFFSHORE GUATEMALA", "GUATEMALA", "BELIZE", "HONDURAS", "EL SALVADOR", "NICARAGUA", "OFFSHORE EL SALVADOR"]) assert.equal(hasForeignLabel(l), true, l);
  for (const l of ["BAJA CALIFORNIA, MEXICO", "BAJA CALIFORNIA SUR, MEXICO", "GULF OF CALIFORNIA", "OAXACA, MEXICO", "OFFSHORE CHIAPAS, MEXICO", "MEXICO-GUATEMALA BORDER REGION", ""]) assert.equal(hasForeignLabel(l), false, l);
});

test("label rule: US-named events at sea are dropped, Mexican land is kept whatever the name says", () => {
  assert.equal(clip.reason(-118.09, 32.6, "SOUTHERN CALIFORNIA"), "label"); // off San Clemente Island, at sea
  assert.equal(clip.reason(-96.5, 26.5, "SOUTHERN TEXAS"), "label"); // Gulf of Mexico off Texas
  assert.equal(clip.reason(-104.139, 31.552, "WESTERN TEXAS"), "land"); // on US land
  assert.equal(clip.reason(-104.45, 29.5, "WESTERN TEXAS"), null); // Chihuahua land labelled by a Texas town
  assert.equal(clip.reason(-117.2, 31.8, "BAJA CALIFORNIA, MEXICO"), null); // off Ensenada
  assert.equal(clip.reason(-111.0, 27.0, "GULF OF CALIFORNIA"), null);
  assert.equal(clip.reason(-96.5, 24.0, "TAMAULIPAS, MEXICO"), null);
  assert.equal(clip.reason(-115.8, 32.7), "land"); // no name needed for the land rule
});

test("label rule also covers the Pacific off Guatemala; Mexican names near that corner stay", () => {
  assert.equal(clip.reason(-91.982, 14.152, "OFFSHORE GUATEMALA"), "label");
  assert.equal(clip.reason(-92.174, 14.258, "OFFSHORE GUATEMALA"), "label");
  assert.equal(clip.reason(-92.8, 14.2, "OFFSHORE CHIAPAS, MEXICO"), null);
  assert.equal(clip.reason(-93.5, 15.0, "OFFSHORE CHIAPAS, MEXICO"), null);
  assert.equal(clip.reason(-92.5, 15.2, "MEXICO-GUATEMALA BORDER REGION"), null); // shared name, Mexican land
  assert.equal(clip.reason(-91.5, 15.0, "GUATEMALA"), "land");
});
