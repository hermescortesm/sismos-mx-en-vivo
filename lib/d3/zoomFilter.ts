type ZoomEvent = { type: string; ctrlKey?: boolean; metaKey?: boolean; button?: number; touches?: { length: number } };

/**
 * d3-zoom filter. A plain mouse wheel is ignored so the page can scroll; zoom needs Ctrl/Cmd (a trackpad
 * pinch arrives as a wheel event with ctrlKey). Dragging pans with the primary button. On touch screens
 * only two-finger gestures reach the map, so one finger scrolls the page.
 */
export function zoomFilter(ev: ZoomEvent): boolean {
  if (ev.type === "wheel") return !!(ev.ctrlKey || ev.metaKey);
  if (ev.type.startsWith("touch")) return (ev.touches?.length ?? 0) >= 2;
  return !ev.button && !ev.ctrlKey;
}
