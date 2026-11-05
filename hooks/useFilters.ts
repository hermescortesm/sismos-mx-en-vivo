"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { applyFilters } from "@/lib/filters";
import { defaultFilters, filtersFromParams, filtersToParams } from "@/lib/filtersUrl";
import type { Filters, Quake } from "@/lib/usgs";

const NO_QUAKES: Quake[] = [];

/** Single Filters state, stored in the URL query so reloads and shared links restore it. */
export function useFilters(quakes: Quake[] = NO_QUAKES) {
  const [now] = useState(() => new Date());
  const search = useSearchParams().toString();
  const value = useMemo(() => filtersFromParams(new URLSearchParams(search), now), [search, now]);

  const write = useCallback((next: Filters) => {
    window.history.replaceState(null, "", `?${filtersToParams(next)}`);
  }, []);

  const onChange = useCallback((patch: Partial<Filters>) => write({ ...value, ...patch }), [value, write]);
  const onReset = useCallback(() => write(defaultFilters(new Date())), [write]);

  const counts = useMemo(
    () => ({ total: quakes.length, visible: applyFilters(quakes, value).length }),
    [quakes, value],
  );

  return { value, onChange, onReset, counts };
}
