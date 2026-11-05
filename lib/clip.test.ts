import { test } from "node:test";
import assert from "node:assert/strict";
import borders from "../public/geo/mexico.topo.json" with { type: "json" };
import type { Topology } from "topojson-specification";
import { createForeignLandTest } from "./clip.ts";
import { parseFeed } from "./usgs.ts";

const isForeign = createForeignLandTest(borders as unknown as Topology);

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

const feat = (id: string, lon: number, lat: number, time: number) => ({
  id,
  properties: { mag: 3.1, place: id, time, url: "https://u/" + id },
  geometry: { coordinates: [lon, lat, 10] },
});

test("parseFeed with the clip keeps Mexican land and sea, drops neighbours, and sorts newest first", () => {
  const feed = {
    features: [
      feat("ocotillo", -115.8, 32.7, 5),
      feat("tijuana", -117.0, 32.5, 4),
      feat("toyah", -103.9, 31.3, 3),
      feat("acapulco", -99.9, 16.85, 2),
      feat("guatemala", -91.5, 15.0, 1),
      feat("gulf", -111.0, 27.0, 6),
      feat("far-away", -150, 60, 7), // outside the bounding box
    ],
  };
  assert.deepEqual(parseFeed(feed, isForeign).map((q) => q.id), ["gulf", "tijuana", "acapulco"]);
  // Without the clip function the old rectangle behaviour is unchanged.
  assert.deepEqual(parseFeed(feed).map((q) => q.id), ["gulf", "ocotillo", "tijuana", "toyah", "acapulco", "guatemala"]);
});
