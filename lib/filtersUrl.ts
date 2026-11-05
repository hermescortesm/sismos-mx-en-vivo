import type { Filters, RegionId } from "./quakes.ts";

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

/** Nearest multiple of `step` (counted from 0; the ranges start at multiples of their step). */
const snap = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(2));

/** Clamps to the range and snaps to the slider step, so the labels always match the thumbs. */
function pair(s: string | null, [lo, hi]: [number, number], fallback: [number, number], step: number): [number, number] {
  const m = s?.match(PAIR);
  if (!m) return fallback;
  const a = snap(Math.min(Math.max(+m[1], lo), hi), step);
  const b = snap(Math.min(Math.max(+m[2], lo), hi), step);
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
    mag: pair(p.get("mag"), MAG_RANGE, d.mag, 0.1),
    depthKm: pair(p.get("depth"), DEPTH_RANGE, d.depthKm, 5),
    dates: from && to && from <= to ? [from, endOfDay(to)] : d.dates,
    region: region && REGIONS.includes(region) ? (region as RegionId) : "todas",
    window: w && +w[1] < +w[2] ? [new Date(+w[1]), new Date(+w[2])] : null,
  };
}

/** True when the filters equal the defaults (compared the way they are stored in the URL). */
export function isDefaultFilters(f: Filters, now: Date): boolean {
  return filtersToParams(f).toString() === filtersToParams(defaultFilters(now)).toString();
}

/** True when the date range is the default one (yesterday to today). */
export function isDefaultDates(dates: [Date, Date], now: Date): boolean {
  const d = defaultFilters(now).dates;
  return toDateInput(dates[0]) === toDateInput(d[0]) && toDateInput(dates[1]) === toDateInput(d[1]);
}
