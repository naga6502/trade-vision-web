"use client";

import { useEffect, useRef, type DependencyList } from "react";

// Runs `run` immediately and then on a fixed interval, so live pages keep
// pulling fresh data (e.g. after the market opens) instead of fetching once.
// `run` is read from a ref so the interval always calls the latest closure
// without needing to be in the dependency list.
export function useAutoRefresh(
  run: () => void,
  deps: DependencyList,
  intervalMs = 10_000,
) {
  const saved = useRef(run);
  saved.current = run;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled) saved.current();
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
