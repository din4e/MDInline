"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe media query. Returns `false` during SSR/static generation and the
 * real match on the client, without triggering hydration-mismatch warnings.
 * (useSyncExternalStore uses getServerSnapshot for the hydration pass, then
 * re-renders with the live value.)
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
