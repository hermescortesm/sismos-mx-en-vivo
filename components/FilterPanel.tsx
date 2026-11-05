"use client";

import { useState } from "react";
import RangeSlider from "./RangeSlider";
import { DEPTH_RANGE, MAG_RANGE, endOfDay, fromDateInput, isDefaultDates, startOfDay, toDateInput } from "@/lib/filtersUrl";
import { REGION_OPTIONS } from "@/lib/mobileFilters";
import type { Filters } from "@/lib/quakes";

type Props = {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
};

const PRESETS = [
  { hours: 1, label: "Última hora" },
  { hours: 6, label: "6 h" },
  { hours: 12, label: "12 h" },
  { hours: 24, label: "24 h" },
];

const DEPTH_LEGEND = [
  "0–33 km · superficial",
  "33–70 km",
  "70–150 km · intermedia",
  "150–300 km",
  "> 300 km · profunda",
];
const MAG_LEGEND = ["< 3", "3–3.9", "4–4.9", "5–5.9", "≥ 6"];

const HOUR = 3_600_000;

export default function FilterPanel({ value, onChange, onReset }: Props) {
  const { window: win, dates } = value;
  const [mountedAt] = useState(() => new Date());

  const applyPreset = (hours: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - hours * HOUR);
    onChange({
      dates: [startOfDay(from), endOfDay(now)],
      window: hours === 24 ? null : [from, now],
    });
  };
  const isActive = (hours: number) =>
    hours === 24 ? win === null && isDefaultDates(dates, mountedAt) : win !== null && win[1].getTime() - win[0].getTime() === hours * HOUR;

  const setDate = (which: 0 | 1, s: string) => {
    const d = fromDateInput(s);
    if (!d) return;
    const [a, b] = dates;
    const next: [Date, Date] =
      which === 0
        ? [d, b < endOfDay(d) ? endOfDay(d) : b]
        : [a > startOfDay(d) ? startOfDay(d) : a, endOfDay(d)];
    onChange({ dates: next });
  };

  return (
    <div className="filters">
      <div className="filters-head">
        <h2>Filtros</h2>
        <button type="button" className="link-btn" onClick={onReset}>
          Restablecer
        </button>
      </div>

      <RangeSlider
        label="Magnitud"
        min={MAG_RANGE[0]}
        max={MAG_RANGE[1]}
        step={0.1}
        value={value.mag}
        onChange={(mag) => onChange({ mag })}
        format={([a, b]) => `M ${a.toFixed(1)} – ${b.toFixed(1)}`}
        ticks={["2.0", "5.0", "8.0"]}
      />

      <div className="field">
        <span className="field-label">Rango de fechas</span>
        <div className="date-grid">
          <label className="date-label">
            Desde
            <input type="date" value={toDateInput(dates[0])} max={toDateInput(dates[1])} onChange={(e) => setDate(0, e.target.value)} />
          </label>
          <label className="date-label">
            Hasta
            <input type="date" value={toDateInput(dates[1])} min={toDateInput(dates[0])} onChange={(e) => setDate(1, e.target.value)} />
          </label>
        </div>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.hours} type="button" aria-pressed={isActive(p.hours)} onClick={() => applyPreset(p.hours)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <RangeSlider
        label="Profundidad"
        min={DEPTH_RANGE[0]}
        max={DEPTH_RANGE[1]}
        step={5}
        value={value.depthKm}
        onChange={(depthKm) => onChange({ depthKm })}
        format={([a, b]) => `${a} – ${b} km`}
        ariaSuffix=" en kilómetros"
        ticks={["0", "350", "700 km"]}
      />

      <label className="field field-label">
        Región
        <select value={value.region} onChange={(e) => onChange({ region: e.target.value as Filters["region"] })}>
          {REGION_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <div className="legend">
        <span className="legend-title muted">Profundidad (color)</span>
        {DEPTH_LEGEND.map((label, i) => (
          <div key={label} className="legend-row">
            <span className="dot" style={{ background: `var(--depth-${i})` }} />
            <span>{label}</span>
          </div>
        ))}
        <span className="legend-title muted" style={{ marginTop: 6 }}>
          Magnitud (tamaño y etiqueta)
        </span>
        <div className="chips">
          {MAG_LEGEND.map((label, i) => (
            <span key={label} className="chip mono" style={{ background: `var(--mag-${i})`, color: `var(--ink-${i})` }}>
              M {label}
            </span>
          ))}
        </div>
      </div>

      <p className="muted footnote">
        Datos: EMSC · seismicportal.eu. Los filtros sincronizan mapa, serie temporal y lista.
      </p>
    </div>
  );
}
