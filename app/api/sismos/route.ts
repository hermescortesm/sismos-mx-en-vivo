import type { Topology } from "topojson-specification";
import { createClip } from "../../../lib/clip.ts";
import { parseFeedParam } from "../../../lib/feedChoice.ts";
import type { FeedName } from "../../../lib/feedChoice.ts";
import { parseFeed } from "../../../lib/quakes.ts";
import { MX_BBOX } from "../../../lib/regions.ts";
import borders from "../../../public/geo/mexico.topo.json" with { type: "json" };

// Built on the first request and kept for the life of the server instance.
let clip: ReturnType<typeof createClip> | undefined;
const isForeign = (lon: number, lat: number, name: string) => (clip ??= createClip(borders as unknown as Topology)).isForeign(lon, lat, name);

const ENDPOINT = "https://www.seismicportal.eu/fdsnws/event/1/query";
const HOUR = 3_600_000;
/** How far back each feed name reaches. */
const SPANS: Record<FeedName, number> = { all_day: 24 * HOUR, all_week: 7 * 24 * HOUR, all_month: 30 * 24 * HOUR };
/**
 * The service documents no maximum. A 30-day query for the Mexico box returned about 1 100 events when tested,
 * so 2 000 leaves room; a very active month could still be cut off at this number (newest first).
 */
const LIMIT = 2000;

/** Query URL for a time span ending now. `start` is rounded down to the minute so the URL (and the cache entry) is stable for 60 s. */
export function upstreamUrl(feed: FeedName, now = Date.now()): string {
  const start = new Date(Math.floor((now - SPANS[feed]) / 60_000) * 60_000).toISOString().slice(0, 19);
  const q = new URLSearchParams({
    start,
    minlat: String(MX_BBOX.latMin),
    maxlat: String(MX_BBOX.latMax),
    minlon: String(MX_BBOX.lonMin),
    maxlon: String(MX_BBOX.lonMax),
    format: "json",
    orderby: "time",
    limit: String(LIMIT),
  });
  return `${ENDPOINT}?${q}`;
}

export async function GET(req: Request) {
  const feed = parseFeedParam(new URL(req.url).searchParams.get("feed"));
  if (!feed) return Response.json({ error: "Unknown feed" }, { status: 400 });

  const headers = new Headers();
  // Conditional request headers go upstream when the client sends them.
  const inm = req.headers.get("if-none-match");
  if (inm) headers.set("If-None-Match", inm);
  const ims = req.headers.get("if-modified-since");
  if (ims) headers.set("If-Modified-Since", ims);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl(feed), { headers, next: { revalidate: 60 } });
  } catch {
    return Response.json({ error: "EMSC feed unreachable" }, { status: 502 });
  }

  const out: Record<string, string> = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" };
  const etag = upstream.headers.get("etag");
  if (etag) out.ETag = etag;
  const modified = upstream.headers.get("last-modified");
  if (modified) out["Last-Modified"] = modified;

  if (upstream.status === 304) return new Response(null, { status: 304, headers: out });
  // EMSC ignores conditional requests, so compare the client's tag with the one it sent back.
  if (inm && etag && inm.split(",").some((t) => t.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""))) {
    return new Response(null, { status: 304, headers: out });
  }
  // The service answers 204 with no body when no event matches.
  if (upstream.status === 204) return Response.json([], { headers: out });
  if (!upstream.ok) return Response.json({ error: `EMSC responded ${upstream.status}` }, { status: 502 });

  try {
    return Response.json(parseFeed(await upstream.json(), isForeign), { headers: out });
  } catch {
    return Response.json({ error: "EMSC feed invalid" }, { status: 502 });
  }
}
