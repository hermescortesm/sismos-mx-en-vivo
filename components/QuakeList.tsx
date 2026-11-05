"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EmptyFiltered from "./EmptyFiltered";
import { formatQuake, magBucket } from "@/lib/d3/tooltip";
import { tickLabel } from "@/lib/d3/timeline";
import { listRows } from "@/lib/list";
import type { Quake } from "@/lib/usgs";

type Props = {
  /** Events after filters and window. */
  quakes: Quake[];
  /** Ids added by the last feed refresh. */
  added: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Events in the feed before filtering. */
  total: number;
  /** Omit to hide the reset button (filters already the defaults). */
  onResetFilters?: () => void;
  loading?: boolean;
  limit?: number;
};

export default function QuakeList({ quakes, added, selectedId, onSelect, total, onResetFilters, loading = false, limit = 20 }: Props) {
  const [now] = useState(() => Date.now());
  const rows = useMemo(() => listRows(quakes, added, now, limit), [quakes, added, now, limit]);
  const list = useRef<HTMLOListElement>(null);

  // Selecting a circle on the map brings its row into view.
  useEffect(() => {
    if (!selectedId) return;
    const row = list.current?.querySelector(`[data-id="${CSS.escape(selectedId)}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <>
      <div className="list-head">
        <h2>Últimos {limit} sismos</h2>
        <span className="muted">
          {rows.length} de {quakes.length} filtrados
        </span>
      </div>
      {rows.length === 0 && total > 0 && !loading ? (
        <div style={{ padding: 16 }}>
          <EmptyFiltered total={total} onReset={onResetFilters} />
        </div>
      ) : rows.length === 0 ? null : (
        <ol ref={list} className="list">
          {rows.map(({ quake: q, isNew }) => {
            const i = magBucket(q.mag);
            const t = formatQuake(q, now);
            const selected = q.id === selectedId;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  className="row"
                  data-id={q.id}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onSelect(selected ? null : q.id)}
                >
                  <span className="row-mag mono" style={{ background: `var(--mag-${i})`, color: `var(--ink-${i})` }}>
                    {q.mag.toFixed(1)}
                  </span>
                  <span className="row-body">
                    <span className="row-place">{q.place}</span>
                    <span className="row-meta mono muted">
                      <span>{tickLabel(new Date(q.time))}</span>
                      <span>{t.relative}</span>
                      <span>{t.depth}</span>
                      {isNew && <span className="row-new">NUEVO</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
