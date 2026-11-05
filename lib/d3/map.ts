import { geoConicConformal, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import "d3-transition";
import { easeCubicOut } from "d3-ease";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { MAP_COLORS, depthColor, radius } from "./scales.ts";
import { zoomFilter } from "./zoomFilter.ts";
import type { Quake, Theme } from "../usgs.ts";

const W = 760;
const H = 470;
export const VIEW_W = W;
export const VIEW_H = H;
const EXTENT: [[number, number], [number, number]] = [[0, 0], [W, H]];
const HOUR = 3_600_000;

export type MapOptions = {
  theme: Theme;
  onSelect: (id: string | null) => void;
  /** x, y, r are the circle center and radius in pixels relative to the container. */
  onHover: (q: Quake | null, x: number, y: number, r?: number) => void;
  /** Called on every pan or zoom step. */
  onTransform?: () => void;
  geoUrl?: string;
};

export type MapApi = {
  update(quakes: Quake[]): void;
  focus(id: string, k?: number): void;
  /** Current center and radius of a quake's circle, relative to the container. */
  anchorOf(id: string): { x: number; y: number; r: number } | null;
  setTheme(theme: Theme): void;
  setSelected(id: string | null): void;
  setPulse(on: boolean): void;
  zoomBy(factor: number): void;
  resetView(): void;
  destroy(): void;
};

/** Conic conformal projection fitted to Mexico's bounding box (lon -118.5..-86, lat 14..33). */
export function createProjection() {
  return geoConicConformal()
    .rotate([102, 0])
    .parallels([17.5, 29.5])
    .fitExtent([[8, 8], [W - 8, H - 8]], {
      type: "MultiPoint",
      coordinates: [[-118.5, 14], [-86, 14], [-86, 33], [-118.5, 33], [-102, 14], [-102, 33]],
    });
}

export function createMap(container: HTMLElement, opts: MapOptions): MapApi {
  let colors = MAP_COLORS[opts.theme];
  let depth = depthColor(opts.theme);
  let quakes: Quake[] = [];
  let selectedId: string | null = null;
  let k = 1;
  let destroyed = false;
  const abort = new AbortController();

  const projection = createProjection();
  const path = geoPath(projection);
  const pos = (q: Quake) => projection([q.lon, q.lat]) ?? [0, 0];

  container.style.background = colors.sea;
  const svg = select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", "Mapa de México con sismos: círculos proporcionales a la magnitud y coloreados por profundidad")
    .style("display", "block")
    .style("width", "100%")
    .style("height", "100%");
  const layer = svg.append("g");
  const neighbors = layer.append("path");
  const land = layer.append("path");
  const pulses = layer.append("g").attr("pointer-events", "none");
  const points = layer.append("g");

  const strokeOf = (d: Quake) => (d.id === selectedId ? colors.text : colors.bg);
  const strokeWidth = (d: Quake) => (d.id === selectedId ? 2.4 : 0.9) / k;
  const rOf = (d: Quake) => radius(d.mag) / k;

  function paintGeo() {
    neighbors.attr("fill", colors.nb).attr("stroke", colors.landStroke).attr("stroke-width", 0.8 / k);
    land.attr("fill", colors.land).attr("stroke", colors.landStroke).attr("stroke-width", 0.8 / k);
  }
  paintGeo();

  fetch(opts.geoUrl ?? "/geo/mexico.topo.json", { signal: abort.signal })
    .then((r) => r.json() as Promise<Topology>)
    .then((topo) => {
      if (destroyed) return;
      neighbors.datum(feature(topo, topo.objects.neighbors)).attr("d", path);
      land.datum(feature(topo, topo.objects.mexico)).attr("d", path);
    })
    .catch(() => {}); // map still works without borders

  function anchorFor(node: Element) {
    const box = container.getBoundingClientRect();
    const b = node.getBoundingClientRect();
    return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top, r: b.width / 2 };
  }

  function restyle() {
    paintGeo();
    points
      .selectAll<SVGCircleElement, Quake>("circle")
      .attr("r", rOf)
      .attr("stroke-width", strokeWidth);
    pulses
      .selectAll<SVGCircleElement, Quake>("circle")
      .attr("r", rOf)
      .attr("stroke-width", 1.6 / k);
  }

  const zb = zoom<SVGSVGElement, unknown>()
    .filter(zoomFilter)
    .scaleExtent([1, 8])
    .extent(EXTENT)
    .translateExtent(EXTENT)
    .on("zoom", (ev) => {
      layer.attr("transform", ev.transform.toString());
      if (ev.transform.k !== k) {
        k = ev.transform.k;
        restyle();
      }
      opts.onTransform?.();
    });
  svg.call(zb).style("touch-action", "pan-y"); // one finger scrolls the page

  function drawPulses() {
    const since = Date.now() - HOUR;
    pulses
      .selectAll<SVGCircleElement, Quake>("circle")
      .data(quakes.filter((q) => q.time > since), (d) => d.id)
      .join("circle")
      .attr("class", "pulse")
      .attr("cx", (d) => pos(d)[0])
      .attr("cy", (d) => pos(d)[1])
      .attr("r", rOf)
      .attr("fill", "none")
      .attr("stroke", (d) => depth(d.depthKm))
      .attr("stroke-width", 1.6 / k);
  }

  return {
    update(next) {
      quakes = next.slice().sort((a, b) => b.mag - a.mag); // small events drawn on top
      const sel = points.selectAll<SVGCircleElement, Quake>("circle").data(quakes, (d) => d.id);

      sel.exit().style("pointer-events", "none").transition().duration(400).style("opacity", 0).remove();

      sel
        .transition()
        .duration(300)
        .style("opacity", 1)
        .attr("cx", (d) => pos(d)[0])
        .attr("cy", (d) => pos(d)[1])
        .attr("r", rOf)
        .attr("fill", (d) => depth(d.depthKm))
        .attr("stroke", strokeOf);

      const entered = sel
        .enter()
        .append("circle")
        .attr("cx", (d) => pos(d)[0])
        .attr("cy", (d) => pos(d)[1])
        .attr("r", 0)
        .attr("fill", (d) => depth(d.depthKm))
        .attr("fill-opacity", 1) // flash: starts opaque with a bright ring
        .attr("stroke", colors.text)
        .attr("stroke-width", strokeWidth)
        .style("cursor", "pointer")
        .on("click", (_, d) => opts.onSelect(d.id === selectedId ? null : d.id))
        .on("mouseenter", (ev: MouseEvent, d) => {
          const a = anchorFor(ev.currentTarget as Element);
          opts.onHover(d, a.x, a.y, a.r);
        })
        .on("mouseleave", () => opts.onHover(null, 0, 0));
      entered
        .transition()
        .duration(600)
        .ease(easeCubicOut)
        .attr("r", rOf)
        .attr("fill-opacity", 0.82)
        .attr("stroke", strokeOf);

      points.selectAll("circle").order();
      drawPulses();
    },

    focus(id, kk = 3) {
      const q = quakes.find((d) => d.id === id);
      if (!q) return;
      const [x, y] = pos(q);
      const t = zoomIdentity.translate(W / 2 - kk * x, H / 2 - kk * y).scale(kk);
      svg.transition().duration(750).call(zb.transform, zb.constrain()(t, EXTENT, EXTENT));
    },

    anchorOf(id) {
      const node = points
        .selectAll<SVGCircleElement, Quake>("circle")
        .filter((d) => d.id === id)
        .node();
      return node ? anchorFor(node) : null;
    },

    setTheme(theme) {
      colors = MAP_COLORS[theme];
      depth = depthColor(theme);
      container.style.background = colors.sea;
      paintGeo();
      points
        .selectAll<SVGCircleElement, Quake>("circle")
        .transition()
        .duration(300)
        .attr("fill", (d) => depth(d.depthKm))
        .attr("stroke", strokeOf);
      pulses.selectAll<SVGCircleElement, Quake>("circle").attr("stroke", (d) => depth(d.depthKm));
    },

    setSelected(id) {
      selectedId = id;
      points
        .selectAll<SVGCircleElement, Quake>("circle")
        .attr("stroke", strokeOf)
        .attr("stroke-width", strokeWidth);
    },

    setPulse(on) {
      svg.classed("pulse-off", !on);
    },

    zoomBy(factor) {
      svg.transition().duration(250).call(zb.scaleBy, factor);
    },

    resetView() {
      svg.transition().duration(750).call(zb.transform, zoomIdentity);
    },

    destroy() {
      destroyed = true;
      abort.abort();
      svg.selectAll("*").interrupt();
      svg.on(".zoom", null).remove();
      container.style.background = "";
    },
  };
}
