import { test } from "node:test";
import assert from "node:assert/strict";
import { listRows } from "./list.ts";
import type { Quake } from "./usgs.ts";

const H = 3_600_000;
const now = Date.UTC(2026, 10, 5, 20, 0, 0);
const q = (id: string, ago: number): Quake => ({ id, mag: 3, depthKm: 5, place: "", time: now - ago, lon: 0, lat: 0, url: "", region: "sur" });

test("orders newest first and does not mutate the input", () => {
  const input = [q("old", 5 * H), q("new", 1000), q("mid", 2 * H)];
  assert.deepEqual(listRows(input, [], now).map((r) => r.quake.id), ["new", "mid", "old"]);
  assert.equal(input[0].id, "old");
});

test("limit defaults to 20 and can be changed", () => {
  const many = Array.from({ length: 30 }, (_, i) => q(`e${i}`, i * 1000));
  assert.equal(listRows(many, [], now).length, 20);
  assert.equal(listRows(many, [], now, 5).length, 5);
  assert.equal(listRows([], [], now).length, 0);
});

test("new tag: last hour (inclusive) or added by the last refresh", () => {
  const rows = listRows([q("a", H), q("b", H + 1), q("c", 3 * H)], ["c"], now);
  assert.deepEqual(rows.map((r) => [r.quake.id, r.isNew]), [["a", true], ["b", false], ["c", true]]);
});
