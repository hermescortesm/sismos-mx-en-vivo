import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection } from "geojson";

export type ClipReason = "land" | "label";

/** US states and neighbouring countries EMSC uses in its region names. */
const FOREIGN_LABEL = /\b(CALIFORNIA|TEXAS|NEW MEXICO|ARIZONA|LOUISIANA|GUATEMALA|BELIZE|HONDURAS|EL SALVADOR|NICARAGUA)\b/;
/** Names that contain one of those words but are Mexican or shared: Baja California, the Gulf of California, the border region. */
const MEXICAN_NAMES = /BAJA CALIFORNIA(?: SUR)?|GULF OF CALIFORNIA|MEXICO-GUATEMALA BORDER REGION/g;

export const hasForeignLabel = (label: string) => FOREIGN_LABEL.test(label.toUpperCase().replace(MEXICAN_NAMES, ""));

/**
 * Builds the "is this event outside Mexico" test from public/geo/mexico.topo.json. Two rules, in this order:
 *  - land: the point lies on land of the United States, Guatemala, Belize, Honduras or El Salvador;
 *  - label: the EMSC region name is a US state or a neighbouring country and the point is not on Mexican land.
 *    This catches events in US waters (off San Diego, Texas, Louisiana) and in the Pacific off Guatemala that the
 *    land polygons cannot see. An event on Mexican land is kept
 *    even when its name says Texas or California, because nearest-town naming puts some border events there.
 *
 * Limits, in plain words: the polygons are simplified, so an event within a few kilometres of the land border can
 * end up on the wrong side. Mexican waters have no polygon, so an event at sea is judged by its name only.
 */
export function createClip(topo: Topology) {
  const neighbours = feature(topo, topo.objects.neighbors) as unknown as FeatureCollection;
  const mexico = feature(topo, topo.objects.mexico) as unknown as FeatureCollection;
  const inside = (fc: FeatureCollection, lon: number, lat: number) => fc.features.some((f) => geoContains(f, [lon, lat]));

  const reason = (lon: number, lat: number, label = ""): ClipReason | null => {
    if (inside(neighbours, lon, lat)) return "land";
    if (hasForeignLabel(label) && !inside(mexico, lon, lat)) return "label";
    return null;
  };
  return { reason, isForeign: (lon: number, lat: number, label = "") => reason(lon, lat, label) !== null };
}
