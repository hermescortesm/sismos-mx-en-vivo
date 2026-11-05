import type { Topology } from "topojson-specification";
import { createForeignLandTest } from "../../../lib/clip.ts";
import { parseFeedParam } from "../../../lib/feedChoice.ts";
import { parseFeed } from "../../../lib/usgs.ts";
import borders from "../../../public/geo/mexico.topo.json" with { type: "json" };

// Built on the first request and kept for the life of the server instance.
let foreignLand: ReturnType<typeof createForeignLandTest> | undefined;
const isForeign = (lon: number, lat: number) => (foreignLand ??= createForeignLandTest(borders as unknown as Topology))(lon, lat);

export async function GET(req: Request) {
  const feed = parseFeedParam(new URL(req.url).searchParams.get("feed"));
  if (!feed) return Response.json({ error: "Unknown feed" }, { status: 400 });
  const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;

  const headers = new Headers();
  // Conditional request headers go upstream; USGS answers with Last-Modified, not ETag.
  const inm = req.headers.get("if-none-match");
  if (inm) headers.set("If-None-Match", inm);
  const ims = req.headers.get("if-modified-since");
  if (ims) headers.set("If-Modified-Since", ims);

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, next: { revalidate: 60 } });
  } catch {
    return Response.json({ error: "USGS feed unreachable" }, { status: 502 });
  }

  const out: Record<string, string> = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" };
  const etag = upstream.headers.get("etag");
  if (etag) out.ETag = etag;
  const modified = upstream.headers.get("last-modified");
  if (modified) out["Last-Modified"] = modified;

  if (upstream.status === 304) return new Response(null, { status: 304, headers: out });
  if (!upstream.ok) return Response.json({ error: `USGS responded ${upstream.status}` }, { status: 502 });

  try {
    return Response.json(parseFeed(await upstream.json(), isForeign), { headers: out });
  } catch {
    return Response.json({ error: "USGS feed invalid" }, { status: 502 });
  }
}
