"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedName } from "@/lib/feedChoice";
import { EMPTY_DIFF, POLL_SECONDS, backoffDelay, diffQuakes } from "@/lib/feed";
import type { FeedDiff } from "@/lib/feed";
import type { FeedStatus, Quake } from "@/lib/usgs";

export type FeedError = { attempt: number; httpStatus: number | null; retryIn: number | null };

/** Polls /api/sismos every 60 s. Pauses when the tab is hidden or the user toggles it. */
export function useQuakeFeed(feedName: FeedName = "all_day") {
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [diff, setDiff] = useState<FeedDiff>(EMPTY_DIFF);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<Omit<FeedError, "retryIn"> | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [nextAt, setNextAt] = useState<number | null>(0); // 0 = due now, null = retries exhausted
  const [now, setNow] = useState(() => Date.now());

  const prevRef = useRef<Quake[] | null>(null);
  const loadedFeed = useRef<FeedName | null>(null);
  const feedRef = useRef(feedName);
  useEffect(() => {
    feedRef.current = feedName;
  });
  // A different date range may need a different feed: fetch right away.
  const [shownFeed, setShownFeed] = useState(feedName);
  if (shownFeed !== feedName) {
    setShownFeed(feedName);
    setNextAt(0);
  }
  const attemptRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const running = !userPaused && !hidden;

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    let httpStatus: number | null = null;
    try {
      const res = await fetch(`/api/sismos?feed=${feedRef.current}`, { signal: ac.signal, cache: "no-store" });
      if (!res.ok) {
        httpStatus = res.status;
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as Quake[];
      attemptRef.current = 0;
      // The first batch of a new feed is not reported as added.
      setDiff(diffQuakes(loadedFeed.current === feedRef.current ? prevRef.current : null, data));
      loadedFeed.current = feedRef.current;
      prevRef.current = data;
      setQuakes(data);
      setLastUpdated(new Date());
      setError(null);
      setNextAt(Date.now() + POLL_SECONDS * 1000);
    } catch {
      if (ac.signal.aborted) return;
      const attempt = ++attemptRef.current;
      const delay = backoffDelay(attempt);
      setError({ attempt, httpStatus });
      setNextAt(delay === null ? null : Date.now() + delay * 1000);
    }
  }, []);

  useEffect(() => {
    if (!running) {
      abortRef.current?.abort();
      return;
    }
    if (nextAt === null) return;
    const id = setTimeout(load, Math.max(0, nextAt - Date.now()));
    return () => clearTimeout(id);
  }, [running, nextAt, load]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      abortRef.current?.abort();
    };
  }, []);

  const toggleLive = useCallback(() => setUserPaused((p) => !p), []);
  const retryNow = useCallback(() => {
    attemptRef.current = 0;
    void load();
  }, [load]);

  const nextRefreshIn = running && nextAt !== null ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : null;
  const status: FeedStatus = !running ? "paused" : error ? "error" : lastUpdated ? "live" : "loading";

  return {
    quakes,
    status,
    lastUpdated,
    nextRefreshIn,
    toggleLive,
    retryNow,
    diff,
    error: error && { ...error, retryIn: nextRefreshIn } satisfies FeedError | null,
  };
}
