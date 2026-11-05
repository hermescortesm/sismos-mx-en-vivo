import type { FeedStatus, Filters } from "./usgs.ts";

export type FeedStateKind = "loading" | "empty" | "filtered-empty" | "error";

type Input = { status: FeedStatus; hasData: boolean; total: number; visible: number };

/** Which state card the map area shows, or null when the map should render normally. */
export function feedKind({ status, hasData, total, visible }: Input): FeedStateKind | null {
  if (status === "error") return "error";
  if (!hasData) return status === "paused" ? null : "loading"; // paused before the first batch: nothing is pending
  if (total === 0) return "empty";
  if (visible === 0) return "filtered-empty";
  return null;
}

const REGION_NAMES = {
  sur: "Pacífico Sur",
  occ: "Occidente",
  golfo: "Golfo de California",
  centro: "Centro y Golfo de México",
} as const;

/** Short description of the active filters, for example "M ≥ 6.0, Occidente". */
export function filtersSummary(f: Filters): string {
  const parts = [f.mag[1] >= 8 ? `M ≥ ${f.mag[0].toFixed(1)}` : `M ${f.mag[0].toFixed(1)}–${f.mag[1].toFixed(1)}`];
  if (f.depthKm[0] > 0 || f.depthKm[1] < 700) parts.push(`${f.depthKm[0]}–${f.depthKm[1]} km`);
  if (f.region !== "todas") parts.push(REGION_NAMES[f.region]);
  if (f.window) parts.push("periodo acotado");
  return parts.join(", ");
}
