"use client";

import { useCallback, useEffect, useRef } from "react";
import { useD3 } from "@/hooks/useD3";
import { createTimeline, windowLabel } from "@/lib/d3/timeline";
import type { Bin, Domain, Window } from "@/lib/d3/timeline";
import type { Quake } from "@/lib/usgs";

type Props = {
  quakes: Quake[];
  bins: Bin[];
  domain: Domain;
  window: Window;
  onBrush: (w: Window) => void;
  selectedId: string | null;
};

export default function Timeline({ quakes, bins, domain, window: win, onBrush, selectedId }: Props) {
  const live = useRef({ onBrush, domain });
  useEffect(() => {
    live.current = { onBrush, domain };
  });

  const create = useCallback(
    (el: HTMLDivElement) =>
      createTimeline(el, { domain: live.current.domain, onBrush: (w) => live.current.onBrush(w) }),
    [],
  );
  const [ref, api] = useD3(create);

  useEffect(() => api.current?.update(bins, quakes, domain), [bins, quakes, domain, api]);
  useEffect(() => api.current?.setWindow(win), [win, api]);
  useEffect(() => api.current?.setSelected(selectedId), [selectedId, api]);

  return (
    <section className="panel timeline" aria-label="Serie temporal">
      <div className="timeline-head">
        <div className="map-title">
          <h2>Serie temporal · últimas 24 h</h2>
          <span className="muted">
            Arrastra sobre la gráfica para acotar el periodo · selección: {windowLabel(win)}
          </span>
        </div>
        <button type="button" className="clear-btn" onClick={() => onBrush(null)}>
          Quitar selección
        </button>
      </div>
      <div ref={ref} className="tl-canvas" />
    </section>
  );
}
