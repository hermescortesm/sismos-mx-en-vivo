"use client";

import { useCallback, useEffect, useRef } from "react";
import { useD3 } from "@/hooks/useD3";
import { createMap } from "@/lib/d3/map";
import { radius } from "@/lib/d3/scales";
import type { Quake, Theme } from "@/lib/usgs";

type Props = {
  quakes: Quake[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover?: (q: Quake | null, x: number, y: number) => void;
  renderer?: "auto" | "svg" | "canvas";
  theme: Theme;
  /** Total events in the feed before filtering; used by the empty state. */
  total: number;
  loading?: boolean;
  /** Stops the pulse rings. */
  paused?: boolean;
  onResetFilters: () => void;
};

const CANVAS_THRESHOLD = 10_000;

export default function QuakeMap({
  quakes,
  selectedId,
  onSelect,
  onHover,
  renderer = "auto",
  theme,
  total,
  loading = false,
  paused = false,
  onResetFilters,
}: Props) {
  // Callbacks and theme are read through refs so the map is created only once.
  const live = useRef({ onSelect, onHover, theme });
  useEffect(() => {
    live.current = { onSelect, onHover, theme };
  });

  const create = useCallback(
    (el: HTMLDivElement) =>
      createMap(el, {
        theme: live.current.theme,
        onSelect: (id) => live.current.onSelect(id),
        onHover: (q, x, y) => live.current.onHover?.(q, x, y),
      }),
    [],
  );
  const [ref, api] = useD3(create);

  useEffect(() => api.current?.update(quakes), [quakes, api]);
  useEffect(() => api.current?.setTheme(theme), [theme, api]);
  useEffect(() => api.current?.setPulse(!paused), [paused, api]);
  useEffect(() => {
    api.current?.setSelected(selectedId);
    if (selectedId) api.current?.focus(selectedId);
  }, [selectedId, api]);

  const canvas = renderer === "canvas" || (renderer === "auto" && quakes.length > CANVAS_THRESHOLD);
  const empty = quakes.length === 0 && !loading;

  return (
    <section className="panel map" aria-label="Mapa de sismos">
      <div className="map-toolbar">
        <div className="map-title">
          <h2>Mapa</h2>
          <span className="muted">{quakes.length} eventos · tamaño = magnitud · color = profundidad</span>
        </div>
        <div className="map-tools">
          <span className="mono muted tag">Render: {canvas ? "Canvas" : "SVG"}</span>
          <button type="button" className="map-btn" aria-label="Acercar" onClick={() => api.current?.zoomBy(1.6)}>
            +
          </button>
          <button type="button" className="map-btn" aria-label="Alejar" onClick={() => api.current?.zoomBy(1 / 1.6)}>
            −
          </button>
          <button type="button" className="map-btn map-btn-wide" onClick={() => api.current?.resetView()}>
            Vista completa
          </button>
        </div>
      </div>

      <div className="map-area">
        <div ref={ref} className="map-canvas" />

        <div className="map-legend muted">
          {[3, 4, 5, 6].map((m) => (
            <div key={m} className="map-legend-item">
              <span className="size-dot" style={{ width: radius(m) * 2, height: radius(m) * 2 }} />
              <span className="mono">M{m}</span>
            </div>
          ))}
          <div className="map-legend-pulse">
            <span className="pulse-dot" />
            Pulso: última hora
          </div>
        </div>

        {empty && (
          <div className="map-empty">
            <div className="panel map-empty-card">
              <div style={{ fontWeight: 600 }}>Ningún sismo coincide con los filtros</div>
              <p className="muted">
                El feed trae {total} eventos en México; amplía la magnitud, la profundidad o la ventana de tiempo.
              </p>
              <button type="button" className="empty-btn" onClick={onResetFilters}>
                Restablecer filtros
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
