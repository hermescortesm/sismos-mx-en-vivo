import { formatQuake } from "./d3/tooltip.ts";
import type { Quake } from "./usgs.ts";

export type Stat = { label: string; value: string; hint: string };

const HOUR = 3_600_000;

/** Median of a list of numbers; null when empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** "13 km SE of Ocotillo, CA" -> "CA"; places without a comma stay whole. */
const shortPlace = (place: string) => (place.includes(",") ? (place.split(",").pop() ?? place).trim() : place);

export type StatValues = {
  count: number;
  strongest: Quake | null;
  lastHour: number;
  /** Median depth in km; null when there are no events. */
  medianDepth: number | null;
};

/** Builds the four cards from already aggregated values (also used for worker results). */
export function statsFromValues({ count, strongest, lastHour, medianDepth }: StatValues, total: number, now: number): Stat[] {
  return [
    { label: "Sismos visibles", value: String(count), hint: `de ${total} en el feed` },
    {
      label: "Magnitud máxima",
      value: strongest ? `M ${strongest.mag.toFixed(1)}` : "—",
      hint: strongest ? `${shortPlace(strongest.place)} · ${formatQuake(strongest, now).relative}` : "sin datos",
    },
    { label: "Última hora", value: String(lastHour), hint: lastHour ? "con pulso en el mapa" : "sin eventos recientes" },
    {
      label: "Profundidad mediana",
      value: medianDepth === null ? "—" : `${Math.round(medianDepth)} km`,
      hint: medianDepth === null ? "sin datos" : "eventos filtrados",
    },
  ];
}

/** Summary cards for the filtered quakes. `total` is every quake in the feed. */
export function computeStats(filtered: Quake[], total: number, now: number): Stat[] {
  return statsFromValues(
    {
      count: filtered.length,
      strongest: filtered.reduce<Quake | null>((m, q) => (!m || q.mag > m.mag ? q : m), null),
      lastHour: filtered.filter((q) => now - q.time <= HOUR).length,
      medianDepth: median(filtered.map((q) => q.depthKm)),
    },
    total,
    now,
  );
}
