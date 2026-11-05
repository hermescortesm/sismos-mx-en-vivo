"use client";

import { useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import FilterPanel from "./FilterPanel";
import FeedState from "./FeedState";
import Header from "./Header";
import MobileFilters from "./MobileFilters";
import MobileSheet from "./MobileSheet";
import type { SheetTab } from "./MobileSheet";
import QuakeList from "./QuakeList";
import QuakeMap from "./QuakeMap";
import StatsBar from "./StatsBar";
import Timeline from "./Timeline";
import { useAggregation } from "@/hooks/useAggregation";
import { useFilters } from "@/hooks/useFilters";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useQuakeFeed } from "@/hooks/useQuakeFeed";
import { useTheme } from "@/hooks/useTheme";
import { announcement, formatCentral } from "@/lib/feed";
import { feedKind, filtersSummary } from "@/lib/feedState";
import { applyFilters } from "@/lib/filters";
import { isDefaultFilters } from "@/lib/filtersUrl";
import { feedForFilters } from "@/lib/feedChoice";
import { HOUR } from "@/lib/d3/timeline";
import { magBucket } from "@/lib/d3/tooltip";

export default function Dashboard() {
  const filters = useFilters();
  const [mountedAt] = useState(() => Date.now());
  const feed = useQuakeFeed(feedForFilters(filters.value, new Date(mountedAt)));
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("lista");
  const end = (feed.lastUpdated ?? new Date(mountedAt)).getTime();
  const domain = useMemo<[Date, Date]>(() => [new Date(end - 24 * HOUR), new Date(end)], [end]);
  // The timeline shows everything except the brush window, which narrows the map and list.
  const base = useMemo(() => applyFilters(feed.quakes, { ...filters.value, window: null }), [feed.quakes, filters.value]);
  const visible = useMemo(() => applyFilters(feed.quakes, filters.value), [feed.quakes, filters.value]);
  const canReset = !isDefaultFilters(filters.value, new Date(end));
  const agg = useAggregation(base, visible, domain, feed.quakes.length, end);
  const kind = feedKind({
    status: feed.status,
    hasData: feed.lastUpdated !== null,
    total: feed.quakes.length,
    visible: visible.length,
  });
  const live = useMemo(() => announcement(feed.quakes, feed.diff.added), [feed.quakes, feed.diff.added]);

  const selected = selectedId ? visible.find((q) => q.id === selectedId) : undefined;

  const map = (
    <QuakeMap quakes={visible} selectedId={selectedId} onSelect={setSelectedId} theme={theme} paused={feed.status === "paused"}>
      {kind && (
        <FeedState
          kind={kind}
          total={feed.quakes.length}
          summary={filtersSummary(filters.value)}
          canReset={canReset}
          onRetry={kind === "error" ? feed.retryNow : filters.onReset}
          onPause={feed.toggleLive}
          httpStatus={feed.error?.httpStatus}
          attempt={feed.error?.attempt}
          retryIn={feed.error?.retryIn}
          lastValid={kind === "error" && feed.lastUpdated ? formatCentral(feed.lastUpdated).slice(-8) : null}
        />
      )}
    </QuakeMap>
  );

  const timeline = (
    <Timeline
      quakes={base}
      bins={agg.bins}
      domain={domain}
      window={filters.value.window}
      onBrush={(window) => filters.onChange({ window })}
      selectedId={selectedId}
      variant={isMobile ? "hist" : "full"}
    />
  );

  const list = (compact: boolean, onSelect: (id: string | null) => void) => (
    <QuakeList
      quakes={visible}
      added={feed.diff.added}
      selectedId={selectedId}
      onSelect={onSelect}
      total={feed.quakes.length}
      onResetFilters={canReset ? filters.onReset : undefined}
      loading={feed.status === "loading"}
      compact={compact}
    />
  );

  const header = (
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
    </>
  );

  if (isMobile) {
    const i = selected ? magBucket(selected.mag) : 0;
    return (
      <>
        {header}
        <main className="mobile-main">
          <StatsBar stats={agg.stats} compact />
          {map}
          {timeline}
        </main>
        <MobileSheet
          open={sheetOpen}
          tab={sheetTab}
          onOpenChange={setSheetOpen}
          onTabChange={setSheetTab}
          lista={list(true, (id) => {
            setSelectedId(id);
            if (id) setSheetOpen(false);
          })}
          filtros={<MobileFilters value={filters.value} onChange={filters.onChange} onReset={filters.onReset} />}
          above={
            selected && (
              <div className="sel-strip">
                <span className="mono sel-mag" style={{ background: `var(--mag-${i})`, color: `var(--ink-${i})` }}>
                  M {selected.mag.toFixed(1)}
                </span>
                <span className="sel-text">
                  {selected.place} · {Math.round(selected.depthKm)} km
                </span>
                <button type="button" className="sel-close" aria-label="Cerrar detalle" onClick={() => setSelectedId(null)}>
                  ×
                </button>
              </div>
            )
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <DashboardShell
        filters={<FilterPanel value={filters.value} onChange={filters.onChange} onReset={filters.onReset} />}
        list={list(false, setSelectedId)}
      >
        <StatsBar stats={agg.stats} />
        {map}
        {timeline}
      </DashboardShell>
    </>
  );
}
