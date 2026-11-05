import type { Filters, Quake, RegionId } from "./quakes.ts";

export const byMag = (q: Quake, [min, max]: [number, number]) => q.mag >= min && q.mag <= max;
export const byDepth = (q: Quake, [min, max]: [number, number]) => q.depthKm >= min && q.depthKm <= max;
export const byRegion = (q: Quake, region: RegionId | "todas") => region === "todas" || q.region === region;
export const byTime = (q: Quake, [from, to]: [Date, Date]) => q.time >= from.getTime() && q.time <= to.getTime();
/** A null window means no brush selection, so everything passes. */
export const byWindow = (q: Quake, w: [Date, Date] | null) => w === null || byTime(q, w);

export function applyFilters(quakes: Quake[], f: Filters): Quake[] {
  return quakes.filter(
    (q) => byMag(q, f.mag) && byDepth(q, f.depthKm) && byRegion(q, f.region) && byTime(q, f.dates) && byWindow(q, f.window),
  );
}
