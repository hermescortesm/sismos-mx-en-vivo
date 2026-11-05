import { scaleUtc } from "d3-scale";
import { select } from "d3-selection";
import { area, curveStepAfter } from "d3-shape";
import { brushX } from "d3-brush";
import { formatCentral } from "../feed.ts";
import { magBucket } from "./tooltip.ts";
import type { Quake } from "../usgs.ts";

const Y0 = 14; // M6.5
const Y1 = 104; // M2.5

type Layout = { W: number; H: number; X0: number; X1: number; BASE: number; HIST: number; AXIS: number; TOP: number; tickY: number; tickStep: number; scatter: boolean };
const LAYOUTS: Record<"full" | "hist", Layout> = {
  full: { W: 760, H: 172, X0: 44, X1: 744, BASE: 150, HIST: 30, AXIS: 154, TOP: 6, tickY: 169, tickStep: 3, scatter: true },
  // Histogram only, for narrow screens.
  hist: { W: 358, H: 64, X0: 0, X1: 358, BASE: 50, HIST: 44, AXIS: 50, TOP: 2, tickY: 62, tickStep: 6, scatter: false },
};
export const HOUR = 3_600_000;

export type Domain = [Date, Date];
export type Window = [Date, Date] | null;
export type Bin = { start: Date; count: number };

/** Hourly counts over the domain; bins start at the domain start. Events outside the domain are ignored. */
export function aggregateBins(quakes: Quake[], domain: Domain): Bin[] {
  const s = +domain[0];
  const e = +domain[1];
  const n = Math.max(1, Math.ceil((e - s) / HOUR));
  const bins = Array.from({ length: n }, (_, i) => ({ start: new Date(s + i * HOUR), count: 0 }));
  for (const q of quakes) {
    if (q.time >= s && q.time <= e) bins[Math.min(n - 1, Math.floor((q.time - s) / HOUR))].count++;
  }
  return bins;
}

/** Keeps a window inside the domain; null when it has no overlap or no width left. */
export function clampWindow(w: Window, domain: Domain): Window {
  if (!w) return null;
  const lo = Math.max(+w[0], +domain[0]);
  const hi = Math.min(+w[1], +domain[1]);
  return hi > lo ? [new Date(lo), new Date(hi)] : null;
}

/**
 * Tick dates every `stepH` hours. Mexico City is UTC-6 year-round, so multiples of 3 h in UTC
 * are also multiples of 3 h in local time.
 */
export function hourTicks(domain: Domain, stepH = 3): Date[] {
  const step = stepH * HOUR;
  const out: Date[] = [];
  for (let t = Math.ceil(+domain[0] / step) * step; t <= +domain[1]; t += step) out.push(new Date(t));
  return out;
}

const hm = (d: Date) => formatCentral(d).slice(-8, -3);

export const windowLabel = (w: Window) => (w ? `${hm(w[0])} – ${hm(w[1])}` : "24 h completas");
export const tickLabel = hm;

export type TimelineOptions = { domain: Domain; onBrush: (w: Window) => void; variant?: "full" | "hist" };

export type TimelineApi = {
  update(bins: Bin[], quakes: Quake[], domain?: Domain): void;
  setWindow(w: Window): void;
  setSelected(id: string | null): void;
  destroy(): void;
};

const MONO = "font-size: 10px; font-family: var(--font-mono), monospace; fill: var(--muted)";

export function createTimeline(container: HTMLElement, opts: TimelineOptions): TimelineApi {
  const variant = opts.variant ?? "full";
  const { H, X0, BASE, HIST, AXIS, TOP, tickY, tickStep, scatter: hasScatter } = LAYOUTS[variant];
  // The viewBox follows the container width (1 unit = 1 px), so the 10 px labels stay 10 px at any width.
  let W: number = LAYOUTS[variant].W;
  let X1: number = LAYOUTS[variant].X1;
  let domain = opts.domain;
  let bins: Bin[] = [];
  let quakes: Quake[] = [];
  let win: Window = null;
  let selectedId: string | null = null;
  let silent = false;
  let x = scaleUtc().domain(domain).range([X0, X1]);

  const yMag = (m: number) => Y1 - ((Math.min(Math.max(m, 2.5), 6.5) - 2.5) / 4) * (Y1 - Y0);

  const svg = select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("role", "img")
    .attr("aria-label", "Eventos por hora y magnitud en las últimas 24 horas");

  const scatter = svg.append("g").attr("class", "tl-scatter");
  (hasScatter ? [3, 4, 5, 6] : []).forEach((m) => {
    scatter.append("line").attr("class", "tl-grid").attr("x1", X0).attr("x2", X1).attr("y1", yMag(m)).attr("y2", yMag(m)).style("stroke", "var(--grid)");
    scatter.append("text").attr("x", 36).attr("y", yMag(m) + 3).attr("style", `${MONO}; text-anchor: end`).text(`M${m}`);
  });

  svg.append("path").attr("class", "tl-area").style("fill", "var(--accent-soft)").style("stroke", "var(--accent)");
  if (hasScatter) svg.append("text").attr("x", 36).attr("y", 148).attr("style", `${MONO}; text-anchor: end`).text("n/h");
  const dots = scatter.append("g");
  const axisLine = svg.append("line").attr("x1", X0).attr("x2", X1).attr("y1", AXIS).attr("y2", AXIS).style("stroke", "var(--line)");
  const ticks = svg.append("g");

  const brush = brushX()
    .extent([[X0, TOP], [X1, AXIS]])
    .on("end", (ev) => {
      if (silent || !ev.sourceEvent) return;
      const s = ev.selection as [number, number] | null;
      opts.onBrush(s ? [x.invert(s[0]), x.invert(s[1])] : null);
    });
  const gBrush = svg.append("g").attr("class", "tl-brush").call(brush);

  function moveBrush() {
    silent = true;
    const w = clampWindow(win, domain);
    gBrush.call(brush.move, w ? [x(w[0]), x(w[1])] : null);
    silent = false;
  }

  function draw() {
    x = scaleUtc().domain(domain).range([X0, X1]);
    const maxC = Math.max(1, ...bins.map((b) => b.count));
    const pts = bins.map((b) => ({ t: b.start, c: b.count }));
    if (pts.length) pts.push({ t: domain[1], c: pts[pts.length - 1].c });
    svg
      .select<SVGPathElement>(".tl-area")
      .attr(
        "d",
        area<{ t: Date; c: number }>()
          .x((d) => x(d.t))
          .y0(BASE)
          .y1((d) => BASE - (d.c / maxC) * HIST)
          .curve(curveStepAfter)(pts),
      );

    const w = clampWindow(win, domain);
    if (hasScatter) dots
      .selectAll<SVGCircleElement, Quake>("circle")
      .data(quakes, (d) => d.id)
      .join("circle")
      .attr("cx", (d) => x(new Date(d.time)))
      .attr("cy", (d) => yMag(d.mag))
      .attr("r", (d) => (d.id === selectedId ? 5 : 3.4))
      .style("fill", (d) => (!w || (d.time >= +w[0] && d.time <= +w[1]) ? `var(--mag-${magBucket(d.mag)})` : "var(--line)"))
      .style("stroke", (d) => (d.id === selectedId ? "var(--text)" : "none"))
      .style("stroke-width", 1.5);

    const tk = hourTicks(domain, tickStep);
    ticks
      .selectAll<SVGGElement, Date>("g")
      .data(tk, (d) => +d)
      .join((enter) => {
        const g = enter.append("g");
        g.append("line").attr("y1", AXIS).attr("y2", AXIS + 4).style("stroke", "var(--muted)");
        g.append("text").attr("y", tickY).attr("style", `${MONO}; text-anchor: middle`);
        return g;
      })
      .attr("transform", (d) => `translate(${x(d)},0)`)
      .select("text")
      .text((d) => tickLabel(d));

    moveBrush();
  }

  function resize(width: number) {
    W = Math.max(280, Math.round(width));
    X1 = variant === "hist" ? W : W - 16;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    scatter.selectAll<SVGLineElement, unknown>(".tl-grid").attr("x2", X1);
    axisLine.attr("x2", X1);
    brush.extent([[X0, TOP], [X1, AXIS]]);
    gBrush.call(brush);
    draw();
  }
  const ro = new ResizeObserver(() => container.clientWidth > 0 && resize(container.clientWidth));
  ro.observe(container);

  return {
    update(b, q, d) {
      bins = b;
      quakes = q;
      if (d) domain = d;
      draw();
    },
    setWindow(w) {
      win = w;
      draw();
    },
    setSelected(id) {
      selectedId = id;
      draw();
    },
    destroy() {
      ro.disconnect();
      svg.on(".brush", null);
      svg.remove();
    },
  };
}
