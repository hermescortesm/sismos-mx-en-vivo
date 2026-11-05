"use client";

import { useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import FilterPanel from "./FilterPanel";
import FeedState from "./FeedState";
import Header from "./Header";
import QuakeList from "./QuakeList";
import QuakeMap from "./QuakeMap";
import StatsBar from "./StatsBar";
import Timeline from "./Timeline";
import { useFilters } from "@/hooks/useFilters";
import { useQuakeFeed } from "@/hooks/useQuakeFeed";
import { useTheme } from "@/hooks/useTheme";
import { announcement, formatCentral } from "@/lib/feed";
import { feedKind, filtersSummary } from "@/lib/feedState";
import { applyFilters } from "@/lib/filters";
import { isDefaultFilters } from "@/lib/filtersUrl";
import { HOUR, aggregateBins } from "@/lib/d3/timeline";

export default function Dashboard() {
  const feed = useQuakeFeed();
  const filters = useFilters(feed.quakes);
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mountedAt] = useState(() => Date.now());
  const end = (feed.lastUpdated ?? new Date(mountedAt)).getTime();
  const domain = useMemo<[Date, Date]>(() => [new Date(end - 24 * HOUR), new Date(end)], [end]);
  // The timeline shows everything except the brush window, which narrows the map and list.
  const base = useMemo(() => applyFilters(feed.quakes, { ...filters.value, window: null }), [feed.quakes, filters.value]);
  const bins = useMemo(() => aggregateBins(base, domain), [base, domain]);
  const visible = useMemo(() => applyFilters(feed.quakes, filters.value), [feed.quakes, filters.value]);
  const canReset = !isDefaultFilters(filters.value, new Date(end));
  const kind = feedKind({
    status: feed.status,
    hasData: feed.lastUpdated !== null,
    total: feed.quakes.length,
    visible: visible.length,
  });
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
          <QuakeList
            quakes={visible}
            added={feed.diff.added}
            selectedId={selectedId}
            onSelect={setSelectedId}
            total={feed.quakes.length}
            onResetFilters={canReset ? filters.onReset : undefined}
            loading={feed.status === "loading"}
          />
        }
      >
        <StatsBar quakes={visible} total={feed.quakes.length} now={end} />
        <QuakeMap
          quakes={visible}
          selectedId={selectedId}
          onSelect={setSelectedId}
          theme={theme}
          paused={feed.status === "paused"}
        >
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
        <Timeline
          quakes={base}
          bins={bins}
          domain={domain}
          window={filters.value.window}
          onBrush={(window) => filters.onChange({ window })}
          selectedId={selectedId}
        />
      </DashboardShell>
    </>
  );
}
