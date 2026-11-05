import type { RegionId } from "./quakes.ts";

export const MX_BBOX = { lonMin: -118.5, lonMax: -86, latMin: 14, latMax: 33 } as const;

export function inMexicoBbox(lon: number, lat: number): boolean {
  return lon >= MX_BBOX.lonMin && lon <= MX_BBOX.lonMax && lat >= MX_BBOX.latMin && lat <= MX_BBOX.latMax;
}

// Coarse boxes, not state borders. Order matters: first match wins.
// Rectangles are enough for a filter; swap for polygons if users report misfiled events.
export function assignRegion(lon: number, lat: number): RegionId {
  // Gulf of California and Baja California
  if ((lat >= 23 && lon < -104) || (lat >= 22 && lon <= -109)) return "golfo";
  // Jalisco, Colima, Michoacan, Nayarit and the Pacific off them
  if (lon < -102) return "occ";
  // Guerrero, Oaxaca, Chiapas Pacific side
  if (lat < 18) return "sur";
  // Puebla, Veracruz, Gulf of Mexico side and the rest
  return "centro";
}
