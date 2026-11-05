"use client";

import {
  DEPTH_CHIPS,
  MAG_CHIPS,
  REGION_OPTIONS,
  activeDepthChip,
  activeMagChip,
  applyDepthChip,
  applyMagChip,
} from "@/lib/mobileFilters";
import type { Filters } from "@/lib/quakes";

type Props = {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
};

export default function MobileFilters({ value, onChange, onReset }: Props) {
  const mag = activeMagChip(value);
  const depth = activeDepthChip(value);
  return (
    <div className="mfilters">
      <div className="field">
        <span className="field-label">Magnitud mínima</span>
        <div className="mchips">
          {MAG_CHIPS.map((c) => (
            <button key={c.id} type="button" aria-pressed={mag === c.id} onClick={() => onChange(applyMagChip(value, c))}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <label className="field field-label">
        Región
        <select className="mselect" value={value.region} onChange={(e) => onChange({ region: e.target.value as Filters["region"] })}>
          {REGION_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span className="field-label">Profundidad</span>
        <div className="mchips">
          {DEPTH_CHIPS.map((c) => (
            <button key={c.id} type="button" aria-pressed={depth === c.id} onClick={() => onChange(applyDepthChip(c))}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="link-btn mreset" onClick={onReset}>
        Restablecer
      </button>
    </div>
  );
}
