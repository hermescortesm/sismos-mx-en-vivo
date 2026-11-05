"use client";

import { useEffect, useRef } from "react";

/**
 * Creates a D3-owned object inside a container div once, and destroys it on unmount.
 * `create` must be stable (useCallback); read changing values through refs.
 */
export function useD3<A extends { destroy(): void }>(create: (el: HTMLDivElement) => A) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<A | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = create(el);
    api.current = a;
    return () => {
      a.destroy();
      api.current = null;
    };
  }, [create]);

  return [ref, api] as const;
}
