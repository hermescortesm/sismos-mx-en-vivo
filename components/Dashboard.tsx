"use client";

import { useMemo } from "react";
import DashboardShell from "./DashboardShell";
import FilterPanel from "./FilterPanel";
import Header from "./Header";
import { useFilters } from "@/hooks/useFilters";
import { useQuakeFeed } from "@/hooks/useQuakeFeed";
import { announcement } from "@/lib/feed";

export default function Dashboard() {
  const feed = useQuakeFeed();
  const filters = useFilters(feed.quakes);
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
        <section className="panel" style={{ padding: 16, minHeight: 360 }}>
          Mapa
          {feed.status === "error" && feed.error && (
            <p>
              {feed.error.httpStatus ? `HTTP ${feed.error.httpStatus} · ` : ""}intento {feed.error.attempt} de 5
              {feed.error.retryIn !== null ? ` · siguiente en ${feed.error.retryIn} s` : ""}{" "}
              <button type="button" className="link-btn" onClick={feed.retryNow}>
                Reintentar ahora
              </button>
            </p>
          )}
        </section>
      </DashboardShell>
    </>
  );
}
