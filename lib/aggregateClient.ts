import { aggregatePacked } from "./aggregate.ts";
import type { Aggregate } from "./aggregate.ts";

/** The part of the Worker API the client uses (a stub can stand in for it in tests). */
export type WorkerLike = {
  postMessage(message: unknown, options?: { transfer: Transferable[] }): void;
  terminate(): void;
  onmessage: ((e: { data: { seq: number; bins: Float32Array; stats: Float32Array } }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessageerror: ((e: unknown) => void) | null;
};

export type AggregateRequest<C> = {
  /** Handed back with the result so the caller knows which inputs it belongs to. */
  ctx: C;
  /** Called again if the request has to be recomputed on the main thread (the first buffers were transferred). */
  pack: () => { base: Float64Array; visible: Float64Array };
  domain: [number, number];
  now: number;
};

type Options<C> = {
  makeWorker: () => WorkerLike;
  onResult: (ctx: C, agg: Aggregate) => void;
  /** Time to wait for the first reply before giving up on the worker. */
  timeoutMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
  /** Where main-thread results are delivered from; a microtask by default, never inside the caller's effect. */
  defer?: (fn: () => void) => void;
};

/**
 * Runs aggregation in a worker. If the worker cannot be created, errors, or does not answer the first request
 * within `timeoutMs` (blocked script, CSP, extension), it switches to the main thread for the rest of the
 * session and recomputes the latest request at once. Replies for outdated requests are ignored.
 */
export function createAggregateClient<C>(opts: Options<C>) {
  const { timeoutMs = 2000, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id as never), defer = queueMicrotask } = opts;
  let worker: WorkerLike | null = null;
  let fellBack = false;
  let answered = false;
  let seq = 0;
  let timer: unknown = null;
  const pending = new Map<number, AggregateRequest<C>>();

  function compute(id: number, req: AggregateRequest<C>) {
    const { base, visible } = req.pack();
    const agg = aggregatePacked(base, visible, req.domain, req.now);
    defer(() => id === seq && opts.onResult(req.ctx, agg));
  }

  function fallBack() {
    if (fellBack) return;
    fellBack = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
    worker?.terminate();
    worker = null;
    const latest = pending.get(seq);
    pending.clear();
    if (latest) compute(seq, latest);
  }

  try {
    worker = opts.makeWorker();
    worker.onmessage = (e) => {
      const req = pending.get(e.data.seq);
      pending.delete(e.data.seq);
      answered = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
      if (req && e.data.seq === seq) opts.onResult(req.ctx, { bins: e.data.bins, stats: e.data.stats });
    };
    worker.onerror = fallBack;
    worker.onmessageerror = fallBack;
  } catch {
    fellBack = true;
  }

  return {
    request(req: AggregateRequest<C>) {
      const id = ++seq;
      if (fellBack || !worker) return compute(id, req);
      pending.set(id, req);
      const { base, visible } = req.pack();
      worker.postMessage({ seq: id, base, visible, domain: req.domain, now: req.now }, { transfer: [base.buffer, visible.buffer] });
      if (!answered && timer === null) timer = setTimer(fallBack, timeoutMs);
    },
    destroy() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      worker?.terminate();
      worker = null;
      pending.clear();
    },
    get usingMainThread() {
      return fellBack;
    },
  };
}
