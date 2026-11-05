import { quadtree } from "d3-quadtree";
import { formatCentral } from "../feed.ts";
import type { Quake } from "../usgs.ts";

export type HitPoint = { x: number; y: number; q: Quake };

/** Nearest-point lookup in the same coordinate space as the given points. Shared by SVG and Canvas. */
export function createHitTester(points: HitPoint[]) {
  const tree = quadtree<HitPoint>()
    .x((p) => p.x)
    .y((p) => p.y)
    .addAll(points);
  return { find: (x: number, y: number, radius: number): Quake | null => tree.find(x, y, radius)?.q ?? null };
}

export type Anchor = { x: number; y: number; r?: number };
export type Size = { w: number; h: number };
export type Placement = { left: number; top: number; side: "above" | "below" | "left" | "right" };

const EDGE = 4;

/**
 * Places a tooltip box next to an anchor circle without covering it. Tries above, below, right, left
 * inside the container. If none fits (small map), it still goes above or below the circle, on the side
 * that sticks out less, and extends past the container edge rather than covering the circle.
 */
export function placeTooltip(anchor: Anchor, box: Size, container: Size, gap = 18): Placement {
  const g = (anchor.r ?? 0) + gap;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
  const left = clamp(anchor.x - box.w / 2, EDGE, Math.max(EDGE, container.w - box.w - EDGE));
  const aboveTop = anchor.y - g - box.h;
  const belowTop = anchor.y + g;

  if (aboveTop >= 0) return { left, top: aboveTop, side: "above" };
  if (belowTop + box.h <= container.h) return { left, top: belowTop, side: "below" };

  const top = clamp(anchor.y - box.h / 2, EDGE, Math.max(EDGE, container.h - box.h - EDGE));
  if (anchor.x + g + box.w <= container.w) return { left: anchor.x + g, top, side: "right" };
  if (anchor.x - g - box.w >= 0) return { left: anchor.x - g - box.w, top, side: "left" };

  const overAbove = -aboveTop;
  const overBelow = belowTop + box.h - container.h;
  return overAbove <= overBelow ? { left, top: aboveTop, side: "above" } : { left, top: belowTop, side: "below" };
}

const rtf = (n: number, unit: string) => `hace ${n} ${unit}`;

export function formatQuake(q: Quake, now: number) {
  const mins = Math.max(1, Math.floor((now - q.time) / 60_000));
  const relative = mins < 60 ? rtf(mins, "min") : mins < 1440 ? rtf(Math.floor(mins / 60), "h") : rtf(Math.floor(mins / 1440), "d");
  return {
    mag: `M ${q.mag.toFixed(1)}`,
    depth: `${Math.round(q.depthKm)} km`,
    time: formatCentral(new Date(q.time)).replace(" · ", " ").slice(0, -3), // dd/mm/aaaa hh:mm
    relative,
  };
}

/** Index 0-4 for the buckets < 3, 3-3.9, 4-4.9, 5-5.9, >= 6, using the magnitude as displayed (one decimal). */
export const magBucket = (mag: number) => {
  const m = Number(mag.toFixed(1)); // same rounding as the displayed "M x.x"
  return m < 3 ? 0 : m < 4 ? 1 : m < 5 ? 2 : m < 6 ? 3 : 4;
};
