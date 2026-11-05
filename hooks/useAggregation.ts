"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pack, toBins, toStats } from "@/lib/aggregate";
import { createAggregateClient } from "@/lib/aggregateClient";
import type { Aggregate } from "@/lib/aggregate";
import type { WorkerLike } from "@/lib/aggregateClient";
import { computeStats } from "@/lib/stats";
import type { Quake } from "@/lib/quakes";

type Ctx = { base: Quake[]; visible: Quake[]; domainStart: number };
type Result = Aggregate & Ctx;

/**
 * Hourly bins (from `base`) and summary cards (from `visible`), computed in a worker. Outdated replies are
 * ignored, and if the worker fails or stays silent for 2 s the main thread takes over (see createAggregateClient).
 */
export function useAggregation(base: Quake[], visible: Quake[], domain: [Date, Date], total: number, now: number) {
  const [result, setResult] = useState<Result | null>(null);
  const client = useRef<ReturnType<typeof createAggregateClient<Ctx>> | null>(null);

  useEffect(() => {
    const c = createAggregateClient<Ctx>({
      makeWorker: () => new Worker(new URL("../workers/aggregate.worker.ts", import.meta.url)) as unknown as WorkerLike,
      onResult: (ctx, agg) => setResult({ ...ctx, ...agg }),
    });
    client.current = c;
    return () => {
      c.destroy();
      client.current = null;
    };
  }, []);

  const start = +domain[0];
  const end = +domain[1];
  useEffect(() => {
    client.current?.request({
      ctx: { base, visible, domainStart: start },
      pack: () => ({ base: pack(base), visible: pack(visible) }),
      domain: [start, end],
      now,
    });
  }, [base, visible, start, end, now]);

  const bins = useMemo(() => (result ? toBins(result.bins, result.domainStart) : []), [result]);
  const stats = useMemo(
    () => (result ? toStats(result.stats, result.visible, total, now) : computeStats([], total, now)),
    [result, total, now],
  );
  const busy = result === null || result.base !== base || result.visible !== visible;

  return { bins, stats, busy };
}
