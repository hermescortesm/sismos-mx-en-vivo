import type { Quake } from "./quakes.ts";

export type ListRow = { quake: Quake; isNew: boolean };

const HOUR = 3_600_000;

/** Newest first, capped at `limit`. A row is new if it happened in the last hour or the last refresh added it. */
export function listRows(quakes: Quake[], added: string[], now: number, limit = 20): ListRow[] {
  const addedSet = new Set(added);
  return quakes
    .slice()
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((quake) => ({ quake, isNew: now - quake.time <= HOUR || addedSet.has(quake.id) }));
}
