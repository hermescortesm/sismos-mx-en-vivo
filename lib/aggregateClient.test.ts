import { test } from "node:test";
import assert from "node:assert/strict";
import { createAggregateClient } from "./aggregateClient.ts";
import type { WorkerLike } from "./aggregateClient.ts";
import { pack } from "./aggregate.ts";
import type { Quake } from "./usgs.ts";

const HOUR = 3_600_000;
const now = Date.UTC(2026, 10, 5, 20, 0, 0);
const quakes: Quake[] = [1, 2, 3].map((i) => ({
  id: `q${i}`, mag: 3 + i, depthKm: 10 * i, place: "x", time: now - i * 10 * 60_000, lon: 0, lat: 0, url: "", region: "sur" as const,
}));
const domain: [number, number] = [now - 24 * HOUR, now];

function stubWorker() {
  const w = {
    posted: [] as { seq: number }[],
    terminated: false,
    onmessage: null as WorkerLike["onmessage"],
    onerror: null as WorkerLike["onerror"],
    onmessageerror: null as WorkerLike["onmessageerror"],
    postMessage(m: unknown) {
      w.posted.push(m as { seq: number });
    },
    terminate() {
      w.terminated = true;
    },
  };
  return w;
}

function manualTimers() {
  const fns = new Map<number, () => void>();
  let next = 0;
  return {
    setTimer: (fn: () => void) => {
      fns.set(++next, fn);
      return next;
    },
    clearTimer: (id: unknown) => fns.delete(id as number),
    fire: () => {
      const all = [...fns.values()];
      fns.clear();
      all.forEach((f) => f());
    },
  };
}

const req = (ctx: string) => ({ ctx, pack: () => ({ base: pack(quakes), visible: pack(quakes) }), domain, now });
const tick = () => new Promise((r) => setTimeout(r, 0));

test("a worker that never replies is replaced by the main thread after the timeout", async () => {
  const w = stubWorker();
  const t = manualTimers();
  const results: string[] = [];
  const c = createAggregateClient<string>({ makeWorker: () => w, onResult: (ctx, agg) => results.push(`${ctx}:${agg.stats[0]}`), ...t });

  c.request(req("a"));
  c.request(req("b")); // newer request while the worker is silent
  assert.equal(w.posted.length, 2);
  assert.deepEqual(results, []);

  t.fire(); // 2 s without any reply
  await tick();
  assert.equal(c.usingMainThread, true);
  assert.equal(w.terminated, true);
  assert.deepEqual(results, ["b:3"]); // only the latest request is recomputed

  c.request(req("c")); // from now on everything runs on the main thread
  await tick();
  assert.equal(w.posted.length, 2);
  assert.deepEqual(results, ["b:3", "c:3"]);
});

test("a reply before the timeout keeps the worker; stale replies are ignored", async () => {
  const w = stubWorker();
  const t = manualTimers();
  const results: string[] = [];
  const c = createAggregateClient<string>({ makeWorker: () => w, onResult: (ctx) => results.push(ctx), ...t });
  c.request(req("a"));
  c.request(req("b"));
  const reply = (seq: number) => w.onmessage?.({ data: { seq, bins: new Float32Array(24), stats: Float32Array.of(0, -1, 0, -1) } });
  reply(1); // outdated
  reply(2);
  assert.deepEqual(results, ["b"]);
  t.fire(); // the reply cancelled the timer, so nothing happens
  assert.equal(c.usingMainThread, false);
  c.request(req("c"));
  assert.equal(w.posted.length, 3);
});

test("worker errors and a failing constructor also fall back", async () => {
  const w = stubWorker();
  const results: string[] = [];
  const c = createAggregateClient<string>({ makeWorker: () => w, onResult: (ctx) => results.push(ctx), ...manualTimers() });
  c.request(req("a"));
  w.onerror?.(new Error("blocked"));
  await tick();
  assert.deepEqual(results, ["a"]);
  assert.equal(c.usingMainThread, true);

  const broken = createAggregateClient<string>({
    makeWorker: () => {
      throw new Error("no worker");
    },
    onResult: (ctx) => results.push(ctx),
  });
  broken.request(req("z"));
  await tick();
  assert.equal(results.at(-1), "z");
});
