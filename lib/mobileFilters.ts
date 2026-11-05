import type { Filters, RegionId } from "./usgs.ts";

export const REGION_OPTIONS: { id: RegionId | "todas"; label: string }[] = [
  { id: "todas", label: "Todo México" },
  { id: "sur", label: "Pacífico Sur (Gro., Oax., Chis.)" },
  { id: "occ", label: "Occidente (Jal., Col., Mich., Nay.)" },
  { id: "golfo", label: "Golfo de California y Baja California" },
  { id: "centro", label: "Centro y Golfo de México (Pue., Ver.)" },
];

export type Chip = { id: string; label: string };

/** Minimum magnitude quick chips. "Todas" is the default minimum (2.5). */
export const MAG_CHIPS: (Chip & { min: number })[] = [
  { id: "all", label: "Todas", min: 2.5 },
  { id: "m3", label: "M ≥ 3", min: 3 },
  { id: "m4", label: "M ≥ 4", min: 4 },
  { id: "m5", label: "M ≥ 5", min: 5 },
];

export const DEPTH_CHIPS: (Chip & { range: [number, number] })[] = [
  { id: "all", label: "Todas", range: [0, 700] },
  { id: "shallow", label: "Superficial < 70 km", range: [0, 70] },
  { id: "mid", label: "Intermedia 70–300 km", range: [70, 300] },
  { id: "deep", label: "Profunda > 300 km", range: [300, 700] },
];

/** Keeps the current maximum so the chip only changes the minimum. */
export const applyMagChip = (f: Filters, chip: (typeof MAG_CHIPS)[number]): Partial<Filters> => ({ mag: [chip.min, f.mag[1]] });

export const applyDepthChip = (chip: (typeof DEPTH_CHIPS)[number]): Partial<Filters> => ({ depthKm: [...chip.range] });

/** Id of the chip matching the filters, or null when the slider on desktop set something in between. */
export function activeMagChip(f: Filters): string | null {
  if (f.mag[1] !== 8) return null;
  if (f.mag[0] <= 2.5) return "all";
  return MAG_CHIPS.find((c) => c.min === f.mag[0])?.id ?? null;
}

export function activeDepthChip(f: Filters): string | null {
  return DEPTH_CHIPS.find((c) => c.range[0] === f.depthKm[0] && c.range[1] === f.depthKm[1])?.id ?? null;
}
