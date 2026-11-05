import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GET, upstreamUrl } from "../app/api/sismos/route.ts";
import { emscFeature } from "./emscFixture.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const feature = (id: string, lon: number, lat: number, time = "2026-11-05T22:00:00Z") => emscFeature(id, lon, lat, { time });

function mockFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; headers: Headers }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), headers: new Headers(init.headers) });
    return respond(String(input), init);
  }) as typeof fetch;
  return calls;
}

const req = (path = "/api/sismos", headers: Record<string, string> = {}) => new Request("http://localhost" + path, { headers });

test("upstreamUrl asks EMSC for the Mexico box and a time span, rounded to the minute", () => {
  const now = Date.UTC(2026, 10, 5, 20, 0, 42);
  const day = new URL(upstreamUrl("all_day", now));
  assert.equal(day.origin + day.pathname, "https://www.seismicportal.eu/fdsnws/event/1/query");
  assert.equal(day.searchParams.get("start"), "2026-11-04T20:00:00");
  assert.equal(new URL(upstreamUrl("all_week", now)).searchParams.get("start"), "2026-10-29T20:00:00");
  assert.equal(new URL(upstreamUrl("all_month", now)).searchParams.get("start"), "2026-10-06T20:00:00");
  assert.deepEqual(
    ["minlat", "maxlat", "minlon", "maxlon", "format", "orderby", "limit"].map((k) => day.searchParams.get(k)),
    ["14", "33", "-118.5", "-86", "json", "time", "2000"],
  );
  assert.equal(day.searchParams.has("end"), false);
});

test("200: normalizes, clips to the bbox and keeps the validators and cache headers", async () => {
  const calls = mockFetch(
    () =>
      Response.json(
        { features: [feature("in", -99, 17), feature("out", -120, 40)] },
        { headers: { etag: 'W/"123"', "last-modified": "Thu, 05 Nov 2026 20:00:00 GMT" } },
      ),
  );
  const res = await GET(req());
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.map((q: { id: string }) => q.id), ["in"]);
  assert.equal(body[0].url, "https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=in");
  assert.equal(res.headers.get("etag"), 'W/"123"');
  assert.equal(res.headers.get("last-modified"), "Thu, 05 Nov 2026 20:00:00 GMT");
  assert.match(res.headers.get("cache-control") ?? "", /s-maxage=60.*stale-while-revalidate=30/);
  assert.match(calls[0].url, /^https:\/\/www\.seismicportal\.eu\/fdsnws\/event\/1\/query\?/);
});

test("204 (no events) is an empty list, not an error", async () => {
  mockFetch(() => new Response(null, { status: 204 }));
  const res = await GET(req());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);
});

test("conditional request headers go upstream and a 304 comes back as 304", async () => {
  const calls = mockFetch(() => new Response(null, { status: 304, headers: { etag: 'W/"123"' } }));
  const res = await GET(req("/api/sismos?feed=all_week", { "If-Modified-Since": "Thu, 05 Nov 2026 20:00:00 GMT", "If-None-Match": 'W/"123"' }));
  assert.equal(res.status, 304);
  assert.equal(res.headers.get("etag"), 'W/"123"');
  assert.equal(calls[0].headers.get("if-modified-since"), "Thu, 05 Nov 2026 20:00:00 GMT");
  assert.equal(calls[0].headers.get("if-none-match"), 'W/"123"');
});

test("the route answers 304 itself when the client's tag equals the one EMSC sent back", async () => {
  mockFetch(() => Response.json({ features: [feature("in", -99, 17)] }, { headers: { etag: 'W/"123"' } }));
  const same = await GET(req("/api/sismos", { "If-None-Match": '"123"' })); // weak comparison, tag without W/
  assert.equal(same.status, 304);
  assert.equal(same.headers.get("etag"), 'W/"123"');
  assert.equal(await same.text(), "");
  const other = await GET(req("/api/sismos", { "If-None-Match": 'W/"999", W/"456"' }));
  assert.equal(other.status, 200);
  const listed = await GET(req("/api/sismos", { "If-None-Match": 'W/"999", W/"123"' }));
  assert.equal(listed.status, 304);
});

test("502 when EMSC is unreachable, answers with an error status, or sends a bad body", async () => {
  mockFetch(() => {
    throw new Error("network down");
  });
  const down = await GET(req());
  assert.equal(down.status, 502);
  assert.match((await down.json()).error, /unreachable/);

  mockFetch(() => new Response("oops", { status: 503 }));
  const res = await GET(req());
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /EMSC responded 503/);

  mockFetch(() => Response.json({ nope: true }));
  const bad = await GET(req());
  assert.equal(bad.status, 502);
  assert.match((await bad.json()).error, /invalid/);

  mockFetch(() => new Response("<html>", { status: 200 }));
  assert.equal((await GET(req())).status, 502);
});

test("400 for a feed outside the whitelist, without calling EMSC", async () => {
  const calls = mockFetch(() => Response.json({ features: [] }));
  const res = await GET(req("/api/sismos?feed=../../admin"));
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test("events on neighbouring land are removed, offshore and Mexican ones stay", async () => {
  mockFetch(() =>
    Response.json({
      features: [
        emscFeature("clemente", -118.09, 32.6, { time: "2026-11-05T22:06:00Z", region: "SOUTHERN CALIFORNIA" }), // US waters, dropped by name
        feature("ocotillo", -115.8, 32.7, "2026-11-05T22:05:00Z"),
        feature("acapulco", -99.9, 16.85, "2026-11-05T22:04:00Z"),
        feature("gulf", -111.0, 27.0, "2026-11-05T22:03:00Z"),
        feature("texas", -104.139, 31.552, "2026-11-05T22:02:00Z"),
        feature("guatemala", -90.102, 14.374, "2026-11-05T22:01:00Z"),
      ],
    }),
  );
  const res = await GET(req());
  assert.deepEqual((await res.json()).map((q: { id: string }) => q.id), ["acapulco", "gulf"]);
  assert.match(res.headers.get("cache-control") ?? "", /s-maxage=60/);
});
