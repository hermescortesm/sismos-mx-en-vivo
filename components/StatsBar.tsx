import type { Stat } from "@/lib/stats";

type Props = {
  /** Cards computed by useAggregation. */
  stats: Stat[];
  /** Small chips with short labels, for narrow screens. */
  compact?: boolean;
};

const SHORT: Record<string, string> = {
  "Sismos visibles": "Visibles",
  "Magnitud máxima": "Máx.",
  "Última hora": "Última hora",
  "Profundidad mediana": "Prof. mediana",
};

export default function StatsBar({ stats, compact = false }: Props) {
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
