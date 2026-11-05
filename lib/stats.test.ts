import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats, median } from "./stats.ts";
import type { Quake } from "./quakes.ts";

const now = Date.UTC(2026, 10, 5, 20, 0, 0);
const MIN = 60_000;
const q = (id: string, o: Partial<Quake>): Quake => ({
  id, mag: 3, depthKm: 10, place: "x, Oax.", time: now - MIN, lon: 0, lat: 0, url: "", region: "sur", ...o,
});

test("median: odd, even, single and empty", () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([7]), 7);
  assert.equal(median([]), null);
});

test("cards for a normal set", () => {
  const stats = computeStats(
    [
      q("a", { mag: 4.26, depthKm: 10, place: "12 km S of Acapulco, Gro.", time: now - 90 * MIN }),
      q("b", { mag: 3.1, depthKm: 30, time: now - 60 * MIN }),
      q("c", { mag: 2.8, depthKm: 20, time: now - 61 * MIN }),
      q("d", { mag: 3.3, depthKm: 41, time: now - 5 * MIN }),
    ],
    9,
    now,
  );
  assert.deepEqual(stats, [
    { label: "Sismos visibles", value: "4", hint: "de 9 en el feed" },
    { label: "Magnitud máxima", value: "M 4.3", hint: "Gro. · hace 1 h" },
    { label: "Última hora", value: "2", hint: "con pulso en el mapa" },
    { label: "Profundidad mediana", value: "25 km", hint: "eventos filtrados" },
  ]);
});

test("empty set has dashes, sin datos and no NaN", () => {
  const stats = computeStats([], 12, now);
  assert.deepEqual(stats.map((s) => s.value), ["0", "—", "0", "—"]);
  assert.equal(stats[1].hint, "sin datos");
  assert.equal(stats[2].hint, "sin eventos recientes");
  assert.equal(stats[3].hint, "sin datos");
  assert.ok(!JSON.stringify(stats).includes("NaN"));
});

test("place without a comma stays whole", () => {
  const [, max] = computeStats([q("a", { place: "Golfo de California", time: now - 5 * MIN })], 1, now);
  assert.equal(max.hint, "Golfo de California · hace 5 min");
});
