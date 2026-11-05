type Options = { mag?: number | null; depth?: number | null; time?: string; region?: string };

/** A feature shaped like the seismicportal.eu response (fields checked against the live service). */
export function emscFeature(unid: string, lon: number, lat: number, o: Options = {}) {
  const { mag = 4, depth = 10, time = "2026-11-05T22:39:59.15Z", region = "OAXACA, MEXICO" } = o;
  return {
    type: "Feature",
    id: unid,
    geometry: { type: "Point", coordinates: [lon, lat, depth === null ? null : -depth] },
    properties: {
      source_id: "2085906",
      source_catalog: "EMSC-RTS",
      lastupdate: "2026-11-05T23:09:41.893754Z",
      time,
      flynn_region: region,
      lat,
      lon,
      depth,
      evtype: "ke",
      auth: "UNM",
      mag,
      magtype: "ml",
      unid,
    },
  };
}
