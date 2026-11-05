import { isDefaultDates } from "./filtersUrl.ts";
import type { Filters } from "./usgs.ts";

export type FeedName = "all_day" | "all_week" | "all_month";

export const FEEDS: readonly FeedName[] = ["all_day", "all_week", "all_month"];

const DAY = 86_400_000;

/** USGS feed that covers a date range: up to 1 day all_day, 2-7 days all_week, more all_month. */
export function feedForRange([from, to]: [Date, Date]): FeedName {
  const days = Math.ceil((+to - +from) / DAY);
  return days <= 1 ? "all_day" : days <= 7 ? "all_week" : "all_month";
}

/** Whitelist for the `feed` query parameter: null (missing) means all_day, unknown values give undefined. */
export function parseFeedParam(value: string | null): FeedName | undefined {
  if (value === null) return "all_day";
  return FEEDS.find((f) => f === value);
}

/**
 * Feed for the current filters. The default range (yesterday and today) and the "Última hora", 6 h, 12 h and
 * 24 h presets all use all_day, because their data lies within the last 24 hours; other ranges follow the span rule.
 */
export function feedForFilters(f: Filters, now: Date): FeedName {
  return isDefaultDates(f.dates, now) ? "all_day" : feedForRange(f.dates);
}
