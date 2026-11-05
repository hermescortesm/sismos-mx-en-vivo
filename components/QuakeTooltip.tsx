"use client";

import { useCallback, useEffect, useState } from "react";
import { formatQuake, magBucket, placeTooltip } from "@/lib/d3/tooltip";
import type { Size } from "@/lib/d3/tooltip";
import type { Quake } from "@/lib/usgs";

type Props = {
  quake: Quake;
  /** Anchor circle center and radius, in pixels relative to the map area. */
  x: number;
  y: number;
  r?: number;
  container: Size;
  pinned: boolean;
  onClose: () => void;
};

const WIDTH = 260;

/** Mount with key={quake.id + pinned} so the box is measured once per content. */
export default function QuakeTooltip({ quake, x, y, r = 0, container, pinned, onClose }: Props) {
  const [now] = useState(() => Date.now());
  const [height, setHeight] = useState<number | null>(null);
  const t = formatQuake(quake, now);
  const i = magBucket(quake.mag);

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      setHeight(el.offsetHeight);
      if (pinned) el.focus({ preventScroll: true });
    },
    [pinned],
  );

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pinned, onClose]);

  const pos = placeTooltip({ x, y, r }, { w: WIDTH, h: height ?? 160 }, container);

  return (
    <div
      ref={ref}
      role="tooltip"
      tabIndex={pinned ? -1 : undefined}
      className="tooltip"
      style={{
        left: pos.left,
        top: pos.top,
        pointerEvents: pinned ? "auto" : "none",
        opacity: height === null ? 0 : 1, // not visibility:hidden, so the card can take focus while it is being measured
      }}
    >
      <div className="tooltip-head">
        <span className="mono tooltip-mag" style={{ background: `var(--mag-${i})`, color: `var(--ink-${i})` }}>
          {t.mag}
        </span>
        <span className="muted">{t.relative}</span>
        {pinned && (
          <button type="button" className="tooltip-close" aria-label="Cerrar detalle" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div className="tooltip-place">{quake.place}</div>
      <dl className="tooltip-dl">
        <dt className="muted">Profundidad</dt>
        <dd className="mono">{t.depth}</dd>
        <dt className="muted">Hora (centro)</dt>
        <dd className="mono">{t.time}</dd>
        <dt className="muted">ID USGS</dt>
        <dd className="mono">{quake.id}</dd>
      </dl>
      <a href={quake.url} target="_blank" rel="noopener" className="tooltip-link">
        Ver en la fuente (USGS) ↗
      </a>
    </div>
  );
}
