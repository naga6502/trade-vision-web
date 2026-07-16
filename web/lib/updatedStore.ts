// Tiny cross-page store for the "last data refresh" timestamp shown in the
// Topbar. Pages call setLastUpdated() after their main data load; the Topbar
// subscribes via useSyncExternalStore. SSR-safe: initialised to now.

let last = new Date();
const listeners = new Set<() => void>();

export function setLastUpdated(d: Date): void {
  last = d;
  listeners.forEach((l) => l());
}

export function getLastUpdated(): Date {
  return last;
}

export function subscribeUpdated(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
