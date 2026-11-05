import { scaleSqrt, scaleThreshold } from "d3-scale";
import type { Theme } from "../usgs.ts";

/** Circle radius in map units (viewBox 760x470): M2.5 -> 2, M8 -> 26. */
export const radius = scaleSqrt().domain([2.5, 8]).range([2, 26]).clamp(true);

const DEPTH_COLORS: Record<Theme, string[]> = {
  dark: ["#a5ecff", "#4cc3f5", "#3b8df0", "#6f6cf0", "#a46cf2"],
  light: ["#38bdf8", "#0b8fd6", "#1d5fd1", "#4b3fc9", "#6d28d9"],
};

const MAG_COLORS: Record<Theme, string[]> = {
  dark: ["#7d8590", "#e3b341", "#f0883e", "#f85149", "#ff2d55"],
  light: ["#6e7781", "#e1a60f", "#e0782b", "#d1242f", "#a40e26"],
};

/** Depth in km -> color. Breaks at 33, 70, 150 and 300 km. */
export const depthColor = (theme: Theme) => scaleThreshold<number, string>().domain([33, 70, 150, 300]).range(DEPTH_COLORS[theme]);

/** Magnitude -> color. Breaks at 3, 4, 5 and 6. */
export const magColor = (theme: Theme) => scaleThreshold<number, string>().domain([3, 4, 5, 6]).range(MAG_COLORS[theme]);

export type MapColors = {
  sea: string;
  land: string;
  landStroke: string;
  nb: string;
  bg: string;
  text: string;
};

export const MAP_COLORS: Record<Theme, MapColors> = {
  dark: { sea: "#0c1218", land: "#1c2632", landStroke: "#384757", nb: "#121922", bg: "#0b0f14", text: "#e6edf3" },
  light: { sea: "#f8fafc", land: "#e3e8ee", landStroke: "#aab5c1", nb: "#eef1f5", bg: "#f3f5f8", text: "#1f2328" },
};
