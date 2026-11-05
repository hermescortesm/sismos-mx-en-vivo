"use client";

type Props = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  /** Text shown at the right of the header; default "a – b". */
  format?: (v: [number, number]) => string;
  /** Appended to the thumbs' aria-labels, e.g. " en kilómetros". */
  ariaSuffix?: string;
  /** Scale labels under the track. */
  ticks?: string[];
};

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

export default function RangeSlider({ label, min, max, step, value, onChange, format, ariaSuffix = "", ticks }: Props) {
  const [lo, hi] = value;
  const fix = (n: number) => +n.toFixed(decimals(step));
  const span = max - min;
  const text = format ? format(value) : `${lo} – ${hi}`;

  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{label}</span>
        <span className="mono muted">{text}</span>
      </div>
      <div className="range">
        <div className="range-track" />
        <div
          className="range-fill"
          style={{
            left: `calc(9px + (100% - 18px) * ${(lo - min) / span})`,
            width: `calc((100% - 18px) * ${(hi - lo) / span})`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${label} mínima${ariaSuffix}`}
          onChange={(e) => onChange([Math.min(+e.target.value, fix(hi - step)), hi])}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${label} máxima${ariaSuffix}`}
          onChange={(e) => onChange([lo, Math.max(+e.target.value, fix(lo + step))])}
        />
      </div>
      {ticks && (
        <div className="range-ticks mono muted">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
