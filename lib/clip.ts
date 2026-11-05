import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection } from "geojson";

/**
 * Returns a test for "this point is on land that belongs to a neighbouring country" (United States, Guatemala,
 * Belize, Honduras, El Salvador), using the border polygons in public/geo/mexico.topo.json.
 *
 * Limits, in plain words: the polygons are simplified, so an event within a few kilometres of the land border can
 * end up on the wrong side. Only land is tested, so offshore events are always kept, including those in US waters
 * just off San Diego or Texas, which the polygons cannot tell apart from Mexican waters.
 */
export function createForeignLandTest(topo: Topology): (lon: number, lat: number) => boolean {
  const neighbours = feature(topo, topo.objects.neighbors) as unknown as FeatureCollection;
  return (lon, lat) => neighbours.features.some((f) => geoContains(f, [lon, lat]));
}
