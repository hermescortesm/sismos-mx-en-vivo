import { aggregatePacked } from "../lib/aggregate";

export type AggregateRequest = {
  seq: number;
  base: Float64Array;
  visible: Float64Array;
  domain: [number, number];
  now: number;
};

export type AggregateResponse = { seq: number; bins: Float32Array; stats: Float32Array };

self.onmessage = (e: MessageEvent<AggregateRequest>) => {
  const { seq, base, visible, domain, now } = e.data;
  const { bins, stats } = aggregatePacked(base, visible, domain, now);
  const res: AggregateResponse = { seq, bins, stats };
  self.postMessage(res, { transfer: [bins.buffer, stats.buffer] });
};
