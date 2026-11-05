import { test } from "node:test";
import assert from "node:assert/strict";
import { createFrameLoop, pixelScale } from "./frameLoop.ts";

function fakeRaf() {
  let cb: ((ts: number) => void) | null = null;
  let scheduled = 0;
  return {
    raf: (fn: (ts: number) => void) => {
      cb = fn;
      scheduled++;
      return scheduled;
    },
    caf: () => {
      cb = null;
    },
    run(ts: number) {
      const fn = cb;
      cb = null;
      fn?.(ts);
    },
    get pending() {
      return cb !== null;
    },
    get scheduled() {
      return scheduled;
    },
  };
}

test("an invalidated scene is drawn once and then no frame stays scheduled", () => {
  const f = fakeRaf();
  const calls: boolean[] = [];
  const loop = createFrameLoop({ render: (full) => calls.push(full), animating: () => false, ...f });
  loop.invalidate();
  loop.invalidate(); // coalesced
  assert.equal(f.scheduled, 1);
  f.run(16);
  assert.deepEqual(calls, [true]);
  assert.equal(f.pending, false);
});

test("while animating, overlay frames are capped at about 30 fps and the scene is not redrawn", () => {
  const f = fakeRaf();
  const calls: boolean[] = [];
  let animating = true;
  const loop = createFrameLoop({ render: (full) => calls.push(full), animating: () => animating, intervalMs: 33, ...f });
  loop.invalidate();
  f.run(0); // full draw
  for (let ts = 16.7; ts <= 200; ts += 16.7) f.run(ts); // 60 Hz display
  const overlay = calls.slice(1);
  assert.equal(calls[0], true);
  assert.ok(overlay.every((full) => full === false));
  assert.ok(overlay.length >= 5 && overlay.length <= 6, `overlay frames: ${overlay.length}`); // 200 ms / 33 ms
  animating = false; // feed paused or no rings left
  f.run(300);
  assert.equal(f.pending, false);
});

test("destroy cancels the pending frame and ignores later invalidation", () => {
  const f = fakeRaf();
  const loop = createFrameLoop({ render: () => {}, animating: () => true, ...f });
  loop.invalidate();
  assert.equal(f.pending, true);
  loop.destroy();
  assert.equal(f.pending, false);
  loop.invalidate();
  assert.equal(f.pending, false);
});

test("pixelScale lowers the device pixel ratio so the canvas stays under 4 megapixels", () => {
  assert.equal(pixelScale(800, 500, 2), 2); // 1.6 MP at 2x
  assert.ok(Math.abs(pixelScale(3000, 1800, 2) ** 2 * 3000 * 1800 - 4_000_000) < 1); // capped
  assert.ok(pixelScale(3000, 1800, 1) < 1); // even 1x is scaled down when the area is huge
  assert.equal(pixelScale(0, 0, 2), 2);
});
