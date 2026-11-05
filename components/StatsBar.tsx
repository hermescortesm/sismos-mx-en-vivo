import { computeStats } from "@/lib/stats";
import type { Quake } from "@/lib/usgs";

type Props = {
  /** Events after filters and window. */
  quakes: Quake[];
  /** Events in the feed before filtering. */
  total: number;
  now: number;
  /** Small chips with short labels, for narrow screens. */
  compact?: boolean;
};

const SHORT: Record<string, string> = {
  "Sismos visibles": "Visibles",
  "Magnitud máxima": "Máx.",
  "Última hora": "Última hora",
  "Profundidad mediana": "Prof. mediana",
};

export default function StatsBar({ quakes, total, now, compact = false }: Props) {
  const stats = computeStats(quakes, total, now);
  return (
    <dl className={compact ? "stats-chips" : "stats"} aria-label="Resumen">
      {stats.map((s) =>
        compact ? (
          <div key={s.label} className="stat-chip">
            <dt className="muted">{SHORT[s.label] ?? s.label}</dt>
            <dd className="mono">{s.value}</dd>
          </div>
        ) : (
          <div key={s.label} className="panel stat">
            <dt className="muted">{s.label}</dt>
            <dd className="stat-value mono">{s.value}</dd>
            <dd className="muted">{s.hint}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
