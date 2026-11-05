import type { FeedStatus, Quake } from "./usgs.ts";

export type FeedDiff = { added: string[]; updated: string[]; removed: string[] };

export const EMPTY_DIFF: FeedDiff = { added: [], updated: [], removed: [] };

const same = (a: Quake, b: Quake) =>
  a.mag === b.mag && a.depthKm === b.depthKm && a.place === b.place && a.time === b.time && a.lon === b.lon && a.lat === b.lat;

/** Compares two refreshes by id. The first load (prev null) reports nothing as added. */
export function diffQuakes(prev: Quake[] | null, next: Quake[]): FeedDiff {
  if (prev === null) return EMPTY_DIFF;
  const before = new Map(prev.map((q) => [q.id, q]));
  const after = new Set(next.map((q) => q.id));
  const added: string[] = [];
  const updated: string[] = [];
  for (const q of next) {
    const old = before.get(q.id);
    if (!old) added.push(q.id);
    else if (!same(old, q)) updated.push(q.id);
  }
  const removed = prev.filter((q) => !after.has(q.id)).map((q) => q.id);
  return { added, updated, removed };
}

export const POLL_SECONDS = 60;
export const MAX_ATTEMPTS = 5;
const BASE_DELAY_SECONDS = 15;

/** Seconds to wait after failed attempt `attempt` (1-based): 15, 30, 60, 120. Null when attempts are exhausted. */
export function backoffDelay(attempt: number): number | null {
  if (attempt < 1 || attempt >= MAX_ATTEMPTS) return null;
  return BASE_DELAY_SECONDS * 2 ** (attempt - 1);
}

/** Screen-reader text for newly added events of magnitude 4 or more. */
export function announcement(quakes: Quake[], added: string[], minMag = 4): string {
  const ids = new Set(added);
  return quakes
    .filter((q) => ids.has(q.id) && q.mag >= minMag)
    .map((q) => `Nuevo sismo M${q.mag.toFixed(1)} · ${q.place}`)
    .join(". ");
}

/** dd/mm/aaaa · hh:mm:ss in Mexico City time. */
export function formatCentral(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** One-line status for narrow screens: "Act. hh:mm:ss · siguiente en N s". */
export function actLabel(status: FeedStatus, lastUpdated: Date | null, nextRefreshIn: number | null): string {
  const act = `Act. ${lastUpdated ? formatCentral(lastUpdated).slice(-8) : "—"}`;
  if (status === "paused") return `${act} · actualización detenida`;
  if (status === "loading") return `${act} · consultando…`;
  if (status === "error") return nextRefreshIn === null ? `${act} · sin conexión` : `${act} · reintento en ${nextRefreshIn} s`;
  return `${act} · siguiente en ${nextRefreshIn ?? 0} s`;
}
