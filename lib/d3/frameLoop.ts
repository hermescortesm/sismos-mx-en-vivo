type FrameLoopOptions = {
  /** `full` is true when the static scene changed; otherwise only the animated overlay needs drawing. */
  render: (full: boolean, ts: number) => void;
  /** Whether something is animating. When it is not, no frame stays scheduled. */
  animating: () => boolean;
  /** Minimum time between overlay-only frames (33 ms is about 30 fps). */
  intervalMs?: number;
  raf?: (cb: (ts: number) => void) => number;
  caf?: (id: number) => void;
};

/**
 * requestAnimationFrame loop for the canvas map. A frame is drawn when the scene was invalidated, or, while
 * something animates, at most every `intervalMs`. With nothing to draw it schedules nothing.
 */
export function createFrameLoop({
  render,
  animating,
  intervalMs = 33,
  raf = (cb) => requestAnimationFrame(cb),
  caf = (id) => cancelAnimationFrame(id),
}: FrameLoopOptions) {
  let id = 0;
  let dirty = false;
  let last = -Infinity;
  let destroyed = false;

  function frame(ts: number) {
    id = 0;
    if (destroyed) return;
    if (dirty) {
      dirty = false;
      last = ts;
      render(true, ts);
    } else if (animating() && ts - last >= intervalMs) {
      last = ts;
      render(false, ts);
    }
    if (dirty || animating()) id = raf(frame);
  }

  return {
    /** The scene changed (data, theme, zoom, size, selection): draw it on the next frame. */
    invalidate() {
      dirty = true;
      if (!id && !destroyed) id = raf(frame);
    },
    destroy() {
      destroyed = true;
      if (id) caf(id);
      id = 0;
    },
  };
}

/** Backing-store scale: the device pixel ratio, lowered so the canvas never exceeds `maxPixels`. */
export function pixelScale(cssWidth: number, cssHeight: number, dpr: number, maxPixels = 4_000_000): number {
  const area = Math.max(1, cssWidth * cssHeight);
  return Math.min(dpr, Math.sqrt(maxPixels / area));
}
