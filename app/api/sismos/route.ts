import { parseFeedParam } from "@/lib/feedChoice";
import { parseFeed } from "@/lib/usgs";

export async function GET(req: Request) {
  const feed = parseFeedParam(new URL(req.url).searchParams.get("feed"));
  if (!feed) return Response.json({ error: "Unknown feed" }, { status: 400 });
  const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;

  const headers = new Headers();
  const inm = req.headers.get("if-none-match");
  if (inm) headers.set("If-None-Match", inm);

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, next: { revalidate: 60 } });
  } catch {
    return Response.json({ error: "USGS feed unreachable" }, { status: 502 });
  }

  const etag = upstream.headers.get("etag");
  const cache = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" };
  const out: Record<string, string> = etag ? { ...cache, ETag: etag } : cache;

  if (upstream.status === 304) return new Response(null, { status: 304, headers: out });
  if (!upstream.ok) return Response.json({ error: `USGS responded ${upstream.status}` }, { status: 502 });

  try {
    return Response.json(parseFeed(await upstream.json()), { headers: out });
  } catch {
    return Response.json({ error: "USGS feed invalid" }, { status: 502 });
  }
}
