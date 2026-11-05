import { test } from "node:test";
import assert from "node:assert/strict";
import { actLabel, announcement, backoffDelay, diffQuakes, formatCentral } from "./feed.ts";
import type { Quake } from "./usgs.ts";

const q = (id: string, o: Partial<Quake> = {}): Quake => ({
  id, mag: 3, depthKm: 10, place: "p", time: 1, lon: -99, lat: 19, url: "", region: "centro", ...o,
});

test("first load reports nothing as added", () => {
  assert.deepEqual(diffQuakes(null, [q("a")]), { added: [], updated: [], removed: [] });
});

test("diff reports added, updated and removed ids", () => {
  const prev = [q("a"), q("b"), q("c")];
  const next = [q("a"), q("b", { mag: 3.4 }), q("d")];
  assert.deepEqual(diffQuakes(prev, next), { added: ["d"], updated: ["b"], removed: ["c"] });
  assert.deepEqual(diffQuakes(next, next), { added: [], updated: [], removed: [] });
});

test("backoff doubles from 15 s and stops after 5 attempts", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(backoffDelay), [15, 30, 60, 120, null]);
  assert.equal(backoffDelay(0), null);
  assert.equal(backoffDelay(6), null);
});

test("announcement lists only new events of magnitude 4 or more", () => {
  const all = [q("a", { mag: 4.62, place: "Acapulco" }), q("b", { mag: 3.9 }), q("c", { mag: 5, place: "Oaxaca" })];
  assert.equal(announcement(all, ["a", "b"]), "Nuevo sismo M4.6 · Acapulco");
  assert.equal(announcement(all, ["a", "c"]), "Nuevo sismo M4.6 · Acapulco. Nuevo sismo M5.0 · Oaxaca");
  assert.equal(announcement(all, []), "");
});

test("formatCentral renders Mexico City time", () => {
  assert.equal(formatCentral(new Date(Date.UTC(2026, 10, 5, 20, 32, 10))), "05/11/2026 · 14:32:10");
  assert.equal(formatCentral(new Date(Date.UTC(2026, 10, 6, 6, 0, 0))), "06/11/2026 · 00:00:00");
});

test("actLabel uses the design wording", () => {
  const t = new Date(Date.UTC(2026, 10, 5, 20, 32, 10));
  assert.equal(actLabel("live", t, 42), "Act. 14:32:10 · siguiente en 42 s");
  assert.equal(actLabel("paused", t, null), "Act. 14:32:10 · actualización detenida");
  assert.equal(actLabel("loading", null, null), "Act. — · consultando…");
  assert.equal(actLabel("error", t, 30), "Act. 14:32:10 · reintento en 30 s");
  assert.equal(actLabel("error", t, null), "Act. 14:32:10 · sin conexión");
});
