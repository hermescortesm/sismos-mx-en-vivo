import { geoPath } from "d3-geo";
import { select } from "d3-selection";
import { pointer } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import type { ZoomTransform } from "d3-zoom";
import "d3-transition";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { VIEW_H as H, VIEW_W as W, createProjection } from "./map.ts";
import type { MapApi, MapOptions } from "./map.ts";
import { MAP_COLORS, depthColor, radius } from "./scales.ts";
import { createFrameLoop, pixelScale } from "./frameLoop.ts";
import { createHitTester } from "./tooltip.ts";
import { zoomFilter } from "./zoomFilter.ts";
import type { HitPoint } from "./tooltip.ts";
import type { Quake } from "../quakes.ts";

const HOUR = 3_600_000;
const PULSE_MS = 1800;

/**
 * Canvas version of the map for large feeds (more than 10 000 events). Same MapApi as the SVG map;
 * circles are drawn in requestAnimationFrame and hover/click go through the shared quadtree hit tester.
 * There are no enter/exit transitions here.
 */
export function createCanvasMap(container: HTMLElement, opts: MapOptions): MapApi {
  let colors = MAP_COLORS[opts.theme];
  let depth = depthColor(opts.theme);
  let pts: HitPoint[] = [];
  let byId = new Map<string, HitPoint>();
  let recent: HitPoint[] = [];
  let tester = createHitTester([]);
  let selectedId: string | null = null;
  let pulseOn = true;
  let t: ZoomTransform = zoomIdentity;
  let hoverId: string | null = null;
  let cw = 0;
  let ch = 0;
  let px = 1; // backing-store pixels per CSS pixel (device pixel ratio, capped by pixelScale)
  let nb: unknown = null;
  let land: unknown = null;
  const abort = new AbortController();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const projection = createProjection();
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Mapa de México con sismos: círculos proporcionales a la magnitud y coloreados por profundidad");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  container.style.background = colors.sea;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  // Land and circles are drawn here only when something changes; every frame just copies it.
  const scene = document.createElement("canvas");
  const sctx = scene.getContext("2d")!;
  const path = geoPath(projection, sctx);

  // The viewBox (760x470) is fitted into the canvas like preserveAspectRatio "meet".
  const fit = () => {
    const s = Math.min(cw / W, ch / H);
    return { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 };
  };

  // Static layer: land, borders, circles (with selection stroke). Redrawn only when the scene changes.
  function renderScene() {
    const { s, ox, oy } = fit();
    const k = t.k;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, scene.width, scene.height);
    sctx.setTransform(px * k * s, 0, 0, px * k * s, px * (t.x + k * ox), px * (t.y + k * oy));

    sctx.lineWidth = 0.8 / k;
    sctx.strokeStyle = colors.landStroke;
    for (const [geo, fill] of [[nb, colors.nb], [land, colors.land]] as const) {
      if (!geo) continue;
      sctx.beginPath();
      path(geo as never);
      sctx.fillStyle = fill;
      sctx.fill();
      sctx.stroke();
    }

    for (const p of pts) {
      const sel = p.q.id === selectedId;
      sctx.beginPath();
      sctx.arc(p.x, p.y, radius(p.q.mag) / k, 0, Math.PI * 2);
      sctx.globalAlpha = 0.82;
      sctx.fillStyle = depth(p.q.depthKm);
      sctx.fill();
      sctx.globalAlpha = 1;
      sctx.strokeStyle = sel ? colors.text : colors.bg;
      sctx.lineWidth = (sel ? 2.4 : 0.9) / k;
      sctx.stroke();
    }
  }

  const animating = () => pulseOn && !reduce && recent.length > 0;

  const loop = createFrameLoop({
    animating,
    render(full) {
      if (full) renderScene();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(scene, 0, 0);
      if (!animating()) return;
      // Pulse rings on top of the copied scene.
      const { s, ox, oy } = fit();
      const k = t.k;
      ctx.setTransform(px * k * s, 0, 0, px * k * s, px * (t.x + k * ox), px * (t.y + k * oy));
      const phase = (performance.now() % PULSE_MS) / PULSE_MS;
      ctx.lineWidth = 1.6 / k;
      for (const p of recent) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (radius(p.q.mag) / k) * (1 + 2.4 * phase), 0, Math.PI * 2);
        ctx.globalAlpha = 0.95 * (1 - phase);
        ctx.strokeStyle = depth(p.q.depthKm);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  });
  const schedule = () => loop.invalidate();

  fetch("/geo/mexico.topo.json", { signal: abort.signal })
    .then((r) => r.json() as Promise<Topology>)
    .then((topo) => {
      nb = feature(topo, topo.objects.neighbors);
      land = feature(topo, topo.objects.mexico);
      schedule();
    })
    .catch(() => {});

  const zb = zoom<HTMLCanvasElement, unknown>()
    .filter(zoomFilter)
    .scaleExtent([1, 8])
    .on("zoom", (ev) => {
      t = ev.transform;
      opts.onTransform?.();
      schedule();
    });
  const sel = select(canvas);
  sel.call(zb).style("touch-action", "pan-y"); // one finger scrolls the page

  function resize() {
    cw = container.clientWidth;
    ch = container.clientHeight;
    px = pixelScale(cw, ch, window.devicePixelRatio || 1);
    canvas.width = scene.width = Math.max(1, Math.round(cw * px));
    canvas.height = scene.height = Math.max(1, Math.round(ch * px));
    zb.extent([[0, 0], [cw, ch]]).translateExtent([[0, 0], [cw, ch]]);
    schedule();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const anchorFor = (p: HitPoint) => {
    const { s, ox, oy } = fit();
    return { x: t.x + t.k * (ox + s * p.x), y: t.y + t.k * (oy + s * p.y), r: radius(p.q.mag) * s };
  };

  // Pointer position -> viewBox coordinates, then ask the quadtree for the circle under it.
  function hit(ev: MouseEvent): HitPoint | null {
    const [px, py] = pointer(ev, canvas);
    const { s, ox, oy } = fit();
    const x = ((px - t.x) / t.k - ox) / s;
    const y = ((py - t.y) / t.k - oy) / s;
    const q = tester.find(x, y, 26 / t.k);
    const p = q && byId.get(q.id);
    return p && Math.hypot(p.x - x, p.y - y) <= radius(p.q.mag) / t.k + 1 / t.k ? p : null;
  }

  sel.on("mousemove.hit", (ev: MouseEvent) => {
    const p = hit(ev);
    const id = p?.q.id ?? null;
    canvas.style.cursor = p ? "pointer" : "";
    if (id === hoverId) return;
    hoverId = id;
    if (p) {
      const a = anchorFor(p);
      opts.onHover(p.q, a.x, a.y, a.r);
    } else opts.onHover(null, 0, 0);
  });
  sel.on("mouseleave.hit", () => {
    hoverId = null;
    opts.onHover(null, 0, 0);
  });
  sel.on("click.hit", (ev: MouseEvent) => {
    const p = hit(ev);
    if (p) opts.onSelect(p.q.id === selectedId ? null : p.q.id);
  });

  return {
    update(next: Quake[]) {
      const sorted = next.slice().sort((a, b) => b.mag - a.mag);
      pts = sorted.map((q) => {
        const [x, y] = projection([q.lon, q.lat]) ?? [0, 0];
        return { x, y, q };
      });
      byId = new Map(pts.map((p) => [p.q.id, p]));
      tester = createHitTester(pts);
      const since = Date.now() - HOUR;
      recent = pts.filter((p) => p.q.time > since);
      schedule();
    },

    focus(id, kk = 3) {
      const p = byId.get(id);
      if (!p) return;
      const { s, ox, oy } = fit();
      const tr = zoomIdentity.translate(cw / 2 - kk * (ox + s * p.x), ch / 2 - kk * (oy + s * p.y)).scale(kk);
      const ext: [[number, number], [number, number]] = [[0, 0], [cw, ch]];
      sel.transition().duration(750).call(zb.transform, zb.constrain()(tr, ext, ext));
    },

    anchorOf(id) {
      const p = byId.get(id);
      return p ? anchorFor(p) : null;
    },

    setTheme(theme) {
      colors = MAP_COLORS[theme];
      depth = depthColor(theme);
      container.style.background = colors.sea;
      schedule();
    },

    setSelected(id) {
      selectedId = id;
      schedule();
    },

    setPulse(on) {
      pulseOn = on;
      schedule();
    },

    zoomBy(factor) {
      sel.transition().duration(250).call(zb.scaleBy, factor);
    },

    resetView() {
      sel.transition().duration(750).call(zb.transform, zoomIdentity);
    },

    destroy() {
      abort.abort();
      loop.destroy();
      ro.disconnect();
      sel.interrupt().on(".zoom", null).on(".hit", null);
      canvas.remove();
      container.style.background = "";
    },
  };
}
