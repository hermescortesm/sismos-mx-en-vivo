"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import QuakeTooltip from "./QuakeTooltip";
import { useD3 } from "@/hooks/useD3";
import { createCanvasMap } from "@/lib/d3/canvasRenderer";
import { createMap } from "@/lib/d3/map";
import type { MapApi } from "@/lib/d3/map";
import { radius } from "@/lib/d3/scales";
import type { Size } from "@/lib/d3/tooltip";
import type { Quake, Theme } from "@/lib/usgs";

type Props = {
  quakes: Quake[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover?: (q: Quake | null, x: number, y: number, r?: number) => void;
  renderer?: "auto" | "svg" | "canvas";
  theme: Theme;
  /** Stops the pulse rings. */
  paused?: boolean;
  /** Feed state card rendered over the map area. */
  children?: ReactNode;
};

const CANVAS_THRESHOLD = 10_000;

export default function QuakeMap({
  quakes,
  selectedId,
  onSelect,
  onHover,
  renderer = "auto",
  theme,
  paused = false,
  children,
}: Props) {
  // Callbacks and theme are read through refs so the map is created only once.
  const live = useRef({ onSelect, onHover, theme });
  useEffect(() => {
    live.current = { onSelect, onHover, theme };
  });

  type Anchor = { x: number; y: number; r: number };
  const [hover, setHover] = useState<{ q: Quake } & Anchor | null>(null);
  const [pinnedAnchor, setPinnedAnchor] = useState<Anchor | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const apiRef = useRef<MapApi | null>(null);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(hintTimer.current), []);
  // A wheel without Ctrl/Cmd scrolls the page; tell the user how to zoom.
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) return;
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 1800);
  };
  const selectedRef = useRef(selectedId);
  useEffect(() => {
    selectedRef.current = selectedId;
  });

  const refreshAnchor = useCallback(() => {
    const id = selectedRef.current;
    setPinnedAnchor(id ? (apiRef.current?.anchorOf(id) ?? null) : null);
  }, []);

  const canvas = renderer === "canvas" || (renderer === "auto" && quakes.length > CANVAS_THRESHOLD);

  const create = useCallback(
    (el: HTMLDivElement) => {
      const m = (canvas ? createCanvasMap : createMap)(el, {
        theme: live.current.theme,
        onSelect: (id) => live.current.onSelect(id),
        onHover: (q, x, y, r = 0) => {
          setHover(q ? { q, x, y, r } : null);
          live.current.onHover?.(q, x, y, r);
        },
        onTransform: refreshAnchor,
      });
      apiRef.current = m;
      return m;
    },
    [refreshAnchor, canvas],
  );
  const [ref, api] = useD3(create);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      refreshAnchor();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, refreshAnchor]);

  useEffect(() => api.current?.update(quakes), [quakes, api, canvas]);
  useEffect(() => api.current?.setTheme(theme), [theme, api, canvas]);
  useEffect(() => api.current?.setPulse(!paused), [paused, api, canvas]);
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    api.current?.setSelected(selectedId);
    if (selectedId) api.current?.focus(selectedId);
    else if (prevSelected.current) api.current?.resetView();
    prevSelected.current = selectedId;
    const raf = requestAnimationFrame(refreshAnchor);
    return () => cancelAnimationFrame(raf);
  }, [selectedId, api, refreshAnchor, canvas]);

  const close = () => onSelect(null);

  const selected = selectedId ? quakes.find((q) => q.id === selectedId) : undefined;
  // Hovering shows a transient card; otherwise the selected event stays pinned.
  const tip = hover
    ? { q: hover.q, a: hover, pinned: hover.q.id === selectedId }
    : selected && pinnedAnchor
      ? { q: selected, a: pinnedAnchor, pinned: true }
      : null;


  return (
    <section className="panel map" aria-label="Mapa de sismos">
      <div className="map-toolbar">
        <div className="map-title">
          <h2>Mapa</h2>
          <span className="muted">{quakes.length} eventos · tamaño = magnitud · color = profundidad</span>
        </div>
        <div className="map-tools">
          {hint && (
            <span className="map-hint" role="status">
              Ctrl + rueda para hacer zoom
            </span>
          )}
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

      <div className="map-area" onWheel={onWheel}>
        <div ref={ref} className="map-canvas" />

        <div className="map-legend muted">
          {[3, 4, 5, 6].map((m) => (
            <div key={m} className={m === 3 || m === 5 ? "map-legend-item map-legend-opt" : "map-legend-item"}>
              <span className="size-dot" style={{ width: radius(m) * 2, height: radius(m) * 2 }} />
              <span className="mono">M{m}</span>
            </div>
          ))}
          <div className="map-legend-pulse">
            <span className="pulse-dot" />
            <span className="pulse-label">Pulso: última hora</span>
          </div>
        </div>

        {tip && (
          <QuakeTooltip
            key={`${tip.q.id}-${tip.pinned}`}
            quake={tip.q}
            x={tip.a.x}
            y={tip.a.y}
            r={tip.a.r}
            container={size}
            pinned={tip.pinned}
            onClose={close}
          />
        )}

        {children}
      </div>
    </section>
  );
}
