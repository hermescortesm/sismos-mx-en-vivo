import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/sismos/route.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const feature = (id: string, lon: number, lat: number, time: number) => ({
  id,
  properties: { mag: 4.2, place: "x, Oax.", time, url: "https://u/" + id },
  geometry: { coordinates: [lon, lat, 12] },
});

function mockFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; headers: Headers }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), headers: new Headers(init.headers) });
    return respond(String(input), init);
  }) as typeof fetch;
  return calls;
}

const req = (path = "/api/sismos", headers: Record<string, string> = {}) => new Request("http://localhost" + path, { headers });

test("200: normalizes, clips to the bbox and forwards Last-Modified", async () => {
  const calls = mockFetch(
    () =>
      Response.json(
        { features: [feature("in", -99, 17, 5), feature("out", -120, 40, 9)] },
        { headers: { "last-modified": "Thu, 05 Nov 2026 20:00:00 GMT" } },
      ),
  );
  const res = await GET(req());
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).map((q: { id: string }) => q.id), ["in"]);
  assert.equal(res.headers.get("last-modified"), "Thu, 05 Nov 2026 20:00:00 GMT");
  assert.match(res.headers.get("cache-control") ?? "", /s-maxage=60/);
  assert.match(calls[0].url, /summary\/all_day\.geojson$/);
});

test("conditional request headers go upstream and a 304 comes back as 304", async () => {
  const calls = mockFetch(() => new Response(null, { status: 304, headers: { "last-modified": "Thu, 05 Nov 2026 20:00:00 GMT" } }));
  const res = await GET(req("/api/sismos?feed=all_week", { "If-Modified-Since": "Thu, 05 Nov 2026 20:00:00 GMT", "If-None-Match": '"abc"' }));
  assert.equal(res.status, 304);
  assert.equal(res.headers.get("last-modified"), "Thu, 05 Nov 2026 20:00:00 GMT");
  assert.equal(calls[0].headers.get("if-modified-since"), "Thu, 05 Nov 2026 20:00:00 GMT");
  assert.equal(calls[0].headers.get("if-none-match"), '"abc"');
  assert.match(calls[0].url, /summary\/all_week\.geojson$/);
});

test("502 when USGS is unreachable, answers with an error status, or sends a bad body", async () => {
  mockFetch(() => {
    throw new Error("network down");
  });
  assert.equal((await GET(req())).status, 502);

  mockFetch(() => new Response("oops", { status: 503 }));
  const res = await GET(req());
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /503/);

  mockFetch(() => Response.json({ nope: true }));
  assert.equal((await GET(req())).status, 502);
});

test("400 for a feed outside the whitelist, without calling USGS", async () => {
  const calls = mockFetch(() => Response.json({ features: [] }));
  const res = await GET(req("/api/sismos?feed=../../admin"));
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});
