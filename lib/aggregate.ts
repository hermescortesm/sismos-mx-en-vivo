import { statsFromValues } from "./stats.ts";
import type { Stat } from "./stats.ts";
import type { Quake } from "./quakes.ts";

const HOUR = 3_600_000;
const STRIDE = 3; // time (ms), magnitude, depth (km)

export type Bin = { start: Date; count: number };

/** Flat columns so the data can be transferred to the worker without copying. Time needs 64 bits. */
export function pack(quakes: Quake[]): Float64Array {
  const out = new Float64Array(quakes.length * STRIDE);
  quakes.forEach((q, i) => {
    out[i * STRIDE] = q.time;
    out[i * STRIDE + 1] = q.mag;
    out[i * STRIDE + 2] = q.depthKm;
  });
  return out;
}

export type Aggregate = {
  /** Hourly counts over the domain, same binning as aggregateBins. */
  bins: Float32Array;
  /** [count, index of the strongest event or -1, events in the last hour, median depth or -1] */
  stats: Float32Array;
};

/** Hourly bins from `base` and summary values from `visible`. Runs inside the worker. */
export function aggregatePacked(base: Float64Array, visible: Float64Array, domain: [number, number], now: number): Aggregate {
  const [s, e] = domain;
  const n = Math.max(1, Math.ceil((e - s) / HOUR));
  const bins = new Float32Array(n);
  for (let i = 0; i < base.length; i += STRIDE) {
    const t = base[i];
    if (t >= s && t <= e) bins[Math.min(n - 1, Math.floor((t - s) / HOUR))]++;
  }

  const count = visible.length / STRIDE;
  let strongest = -1;
  let lastHour = 0;
  const depths = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    if (strongest === -1 || visible[i * STRIDE + 1] > visible[strongest * STRIDE + 1]) strongest = i;
    if (now - visible[i * STRIDE] <= HOUR) lastHour++;
    depths[i] = visible[i * STRIDE + 2];
  }
  depths.sort();
  const mid = Math.floor(count / 2);
  const med = count === 0 ? -1 : count % 2 ? depths[mid] : (depths[mid - 1] + depths[mid]) / 2;

  return { bins, stats: Float32Array.of(count, strongest, lastHour, med) };
}

export function toBins(bins: Float32Array, domainStart: number): Bin[] {
  return Array.from(bins, (count, i) => ({ start: new Date(domainStart + i * HOUR), count }));
}

/** Cards from a worker result; `visible` must be the array that was packed. */
export function toStats(stats: Float32Array, visible: Quake[], total: number, now: number): Stat[] {
  const [count, strongest, lastHour, med] = stats;
  return statsFromValues(
    { count, strongest: strongest >= 0 ? visible[strongest] : null, lastHour, medianDepth: med < 0 ? null : med },
    total,
    now,
  );
}
