import type { Filters, RegionId } from "./usgs.ts";

export const MAG_RANGE: [number, number] = [2, 8];
export const DEPTH_RANGE: [number, number] = [0, 700];

const REGIONS: readonly string[] = ["sur", "occ", "golfo", "centro"];
const NUM = String.raw`(\d+(?:\.\d+)?)`;
const PAIR = new RegExp(`^${NUM}-${NUM}$`);

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const pad = (n: number) => String(n).padStart(2, "0");

/** Local YYYY-MM-DD, the value format of <input type="date">. */
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local midnight of a YYYY-MM-DD string, or null when malformed or not a real date. */
export function fromDateInput(s: string | null): Date | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return toDateInput(d) === s ? d : null;
}

export function defaultFilters(now: Date): Filters {
  return {
    mag: [2.5, MAG_RANGE[1]],
    depthKm: [...DEPTH_RANGE],
    dates: [new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), endOfDay(now)],
    region: "todas",
    window: null,
  };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("mag", `${f.mag[0]}-${f.mag[1]}`);
  p.set("depth", `${f.depthKm[0]}-${f.depthKm[1]}`);
  p.set("from", toDateInput(f.dates[0]));
  p.set("to", toDateInput(f.dates[1]));
  if (f.region !== "todas") p.set("region", f.region);
  if (f.window) p.set("w", `${f.window[0].getTime()}-${f.window[1].getTime()}`);
  return p;
}

function pair(s: string | null, [lo, hi]: [number, number], fallback: [number, number]): [number, number] {
  const m = s?.match(PAIR);
  if (!m) return fallback;
  const a = Math.min(Math.max(+m[1], lo), hi);
  const b = Math.min(Math.max(+m[2], lo), hi);
  return a < b ? [a, b] : fallback;
}

/** Invalid or missing params fall back to defaults, so a bad shared link never breaks the page. */
export function filtersFromParams(p: URLSearchParams, now: Date): Filters {
  const d = defaultFilters(now);
  const from = fromDateInput(p.get("from"));
  const to = fromDateInput(p.get("to"));
  const region = p.get("region");
  const w = p.get("w")?.match(PAIR);
  return {
    mag: pair(p.get("mag"), MAG_RANGE, d.mag),
    depthKm: pair(p.get("depth"), DEPTH_RANGE, d.depthKm),
    dates: from && to && from <= to ? [from, endOfDay(to)] : d.dates,
    region: region && REGIONS.includes(region) ? (region as RegionId) : "todas",
    window: w && +w[1] < +w[2] ? [new Date(+w[1]), new Date(+w[2])] : null,
  };
}
