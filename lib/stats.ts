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

/** Summary cards for the filtered quakes. `total` is every quake in the feed. */
export function computeStats(filtered: Quake[], total: number, now: number): Stat[] {
  const strongest = filtered.reduce<Quake | null>((m, q) => (!m || q.mag > m.mag ? q : m), null);
  const lastHour = filtered.filter((q) => now - q.time <= HOUR).length;
  const med = median(filtered.map((q) => q.depthKm));

  return [
    { label: "Sismos visibles", value: String(filtered.length), hint: `de ${total} en el feed` },
    {
      label: "Magnitud máxima",
      value: strongest ? `M ${strongest.mag.toFixed(1)}` : "—",
      hint: strongest ? `${shortPlace(strongest.place)} · ${formatQuake(strongest, now).relative}` : "sin datos",
    },
    { label: "Última hora", value: String(lastHour), hint: lastHour ? "con pulso en el mapa" : "sin eventos recientes" },
    {
      label: "Profundidad mediana",
      value: med === null ? "—" : `${Math.round(med)} km`,
      hint: med === null ? "sin datos" : "eventos filtrados",
    },
  ];
}
