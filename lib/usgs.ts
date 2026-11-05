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

export type UsgsFeature = {
  id?: unknown;
  properties?: { mag?: unknown; place?: unknown; time?: unknown; url?: unknown } | null;
  geometry?: { coordinates?: unknown } | null;
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Returns null for features missing id, magnitude, time or coordinates. */
export function normalizeFeature(f: UsgsFeature): Quake | null {
  const p = f.properties;
  const c = f.geometry?.coordinates;
  if (typeof f.id !== "string" || !p || !Array.isArray(c)) return null;
  const [lon, lat, depth] = c;
  if (!isNum(p.mag) || !isNum(p.time) || !isNum(lon) || !isNum(lat) || !isNum(depth)) return null;
  return {
    id: f.id,
    mag: p.mag,
    depthKm: depth,
    place: typeof p.place === "string" ? p.place : "",
    time: p.time,
    lon,
    lat,
    url: typeof p.url === "string" ? p.url : `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
    region: assignRegion(lon, lat),
  };
}

/** Normalizes a USGS GeoJSON FeatureCollection and clips it to the Mexico bbox, newest first. */
export function parseFeed(json: unknown): Quake[] {
  const features = (json as { features?: unknown })?.features;
  if (!Array.isArray(features)) throw new Error("Invalid USGS feed");
  return features
    .map((f) => normalizeFeature(f as UsgsFeature))
    .filter((q): q is Quake => q !== null && inMexicoBbox(q.lon, q.lat))
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
