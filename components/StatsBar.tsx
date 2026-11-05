import { computeStats } from "@/lib/stats";
import type { Quake } from "@/lib/usgs";

type Props = {
  /** Events after filters and window. */
  quakes: Quake[];
  /** Events in the feed before filtering. */
  total: number;
  now: number;
};

export default function StatsBar({ quakes, total, now }: Props) {
  return (
    <dl className="stats" aria-label="Resumen">
      {computeStats(quakes, total, now).map((s) => (
        <div key={s.label} className="panel stat">
          <dt className="muted">{s.label}</dt>
          <dd className="stat-value mono">{s.value}</dd>
          <dd className="muted">{s.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
