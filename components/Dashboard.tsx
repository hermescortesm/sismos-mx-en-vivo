"use client";

import { useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import FilterPanel from "./FilterPanel";
import Header from "./Header";
import QuakeMap from "./QuakeMap";
import { useFilters } from "@/hooks/useFilters";
import { useQuakeFeed } from "@/hooks/useQuakeFeed";
import { useTheme } from "@/hooks/useTheme";
import { announcement } from "@/lib/feed";
import { applyFilters } from "@/lib/filters";

export default function Dashboard() {
  const feed = useQuakeFeed();
  const filters = useFilters(feed.quakes);
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = useMemo(() => applyFilters(feed.quakes, filters.value), [feed.quakes, filters.value]);
  const live = useMemo(() => announcement(feed.quakes, feed.diff.added), [feed.quakes, feed.diff.added]);

  return (
    <>
      <Header
        status={feed.status}
        lastUpdated={feed.lastUpdated}
        nextRefreshIn={feed.nextRefreshIn}
        error={feed.error}
        onToggleLive={feed.toggleLive}
      />
      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>
      <DashboardShell
        filters={<FilterPanel value={filters.value} onChange={filters.onChange} onReset={filters.onReset} />}
        list={
          <div style={{ padding: 16 }}>
            Últimos sismos · {filters.counts.visible} de {filters.counts.total}
          </div>
        }
      >
        {feed.status === "error" && feed.error && (
          <p className="panel feed-error">
            {feed.error.httpStatus ? `HTTP ${feed.error.httpStatus} · ` : ""}intento {feed.error.attempt} de 5
            {feed.error.retryIn !== null ? ` · siguiente en ${feed.error.retryIn} s` : ""}{" "}
            <button type="button" className="link-btn" onClick={feed.retryNow}>
              Reintentar ahora
            </button>
          </p>
        )}
        <QuakeMap
          quakes={visible}
          selectedId={selectedId}
          onSelect={setSelectedId}
          theme={theme}
          total={feed.quakes.length}
          loading={feed.status === "loading"}
          paused={feed.status === "paused"}
          onResetFilters={filters.onReset}
        />
      </DashboardShell>
    </>
  );
}
