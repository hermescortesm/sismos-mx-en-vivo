import { formatPlace } from "./place.ts";
import { inMexicoBbox, assignRegion } from "./regions.ts";

export type RegionId = "sur" | "occ" | "golfo" | "centro";
export type FeedStatus = "live" | "paused" | "loading" | "error";
export type Theme = "dark" | "light";

export type Quake = {
  id: string;
  mag: number;
  depthKm: number;
  place: string;
  /** Epoch milliseconds (JSON-safe between API route and client). */
  time: number;
  lon: number;
  lat: number;
  url: string;
  region: RegionId;
};

export type Filters = {
  /** Range 2-8 */
  mag: [number, number];
  /** Range 0-700 km */
  depthKm: [number, number];
  /** Inclusive range; end bound is compared as given. */
  dates: [Date, Date];
  region: RegionId | "todas";
  /** Timeline brush selection; null when none. */
  window: [Date, Date] | null;
};

/** The fields used from an EMSC (seismicportal.eu) GeoJSON feature. */
export type EmscFeature = {
  id?: unknown;
  properties?: {
    unid?: unknown;
    mag?: unknown;
    /** Depth in km, positive down (the geometry z value is the negative of it). */
    depth?: unknown;
    flynn_region?: unknown;
    /** ISO 8601 UTC with 1 to 6 fractional digits. */
    time?: unknown;
    lat?: unknown;
    lon?: unknown;
  } | null;
  geometry?: { coordinates?: unknown } | null;
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Event page on emsc-csem.org for an EMSC event id. */
export const eventUrl = (unid: string) => `https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=${encodeURIComponent(unid)}`;

/** Returns null for features missing an id, magnitude, depth, time or coordinates. */
export function normalizeFeature(f: EmscFeature): Quake | null {
  const p = f.properties;
  if (!p) return null;
  const id = typeof p.unid === "string" ? p.unid : typeof f.id === "string" ? f.id : null;
  const c = Array.isArray(f.geometry?.coordinates) ? (f.geometry?.coordinates as unknown[]) : [];
  const lon = isNum(p.lon) ? p.lon : c[0];
  const lat = isNum(p.lat) ? p.lat : c[1];
  const depth = isNum(p.depth) ? p.depth : isNum(c[2]) ? Math.abs(c[2]) : undefined;
  const time = typeof p.time === "string" ? Date.parse(p.time) : NaN;
  if (id === null || !isNum(p.mag) || !isNum(lon) || !isNum(lat) || !isNum(depth) || !Number.isFinite(time)) return null;
  return {
    id,
    mag: p.mag,
    depthKm: depth,
    place: typeof p.flynn_region === "string" ? formatPlace(p.flynn_region) : "",
    time,
    lon,
    lat,
    url: eventUrl(id),
    region: assignRegion(lon, lat),
  };
}

/** Normalizes an EMSC GeoJSON FeatureCollection, clips it to the Mexico bbox and (optionally) drops neighbouring land, newest first. */
export function parseFeed(json: unknown, isForeign?: (lon: number, lat: number, regionName: string) => boolean): Quake[] {
  const features = (json as { features?: unknown })?.features;
  if (!Array.isArray(features)) throw new Error("Invalid EMSC feed");
  return features
    .map((f) => ({ q: normalizeFeature(f as EmscFeature), name: String((f as EmscFeature)?.properties?.flynn_region ?? "") }))
    // The bounding box also covers the southern US and Central America; `isForeign` removes events outside Mexico.
    .filter(({ q, name }) => q !== null && inMexicoBbox(q.lon, q.lat) && !isForeign?.(q.lon, q.lat, name))
    .map(({ q }) => q as Quake)
    .sort((a, b) => b.time - a.time);
}

const REGION_IDS: readonly string[] = ["sur", "occ", "golfo", "centro"];

/** Runtime check of the /api/sismos payload: an array of well-formed quakes. */
export function isQuakeList(x: unknown): x is Quake[] {
  return (
    Array.isArray(x) &&
    x.every((q) => {
      return (
        q !== null &&
        typeof q === "object" &&
        typeof q.id === "string" &&
        [q.mag, q.depthKm, q.time, q.lon, q.lat].every(isNum) &&
        typeof q.place === "string" &&
        typeof q.url === "string" &&
        REGION_IDS.includes(q.region)
      );
    })
  );
}
