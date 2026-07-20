"use client";

// Client-only watchlist: a snapshot of BUY/SELL signals the user has starred.
// Persisted to localStorage so it survives reloads, and exposed through a tiny
// subscribe/useWatchlist API so every star toggle and the Watchlist panel stay
// in sync. No hydration mismatch because useWatchlist starts empty on both the
// server render and the first client render, then fills from localStorage in an
// effect.

import { useEffect, useState } from "react";

export interface WatchlistPlanZone {
  low: number;
  high: number;
  strength: number;
}

export interface WatchlistPlan {
  buyZone?: WatchlistPlanZone;
  sellZone?: WatchlistPlanZone;
  longStop?: number;
  longTarget?: number;
  shortStop?: number;
  shortTarget?: number;
}

export interface WatchlistEntry {
  symbol: string;
  name: string;
  /** Verdict label captured at save time, e.g. "BUY" / "STRONG SELL". */
  label: string;
  /** Price at which the signal was saved. */
  price: number;
  triggerPrice?: number;
  triggerDate?: string;
  plan?: WatchlistPlan;
  /** ISO timestamp of when the signal was saved. */
  savedAt: string;
}

const KEY = "tv_watchlist_v1";

let cache: WatchlistEntry[] | null = null;
const listeners = new Set<() => void>();

function norm(symbol: string): string {
  return symbol.replace(/\.NS$/, "").replace(/\.BO$/, "").toUpperCase();
}

function read(): WatchlistEntry[] {
  if (typeof window === "undefined") return cache ?? [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as WatchlistEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache ?? [];
}

function write(next: WatchlistEntry[]): void {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / unavailable — keep in-memory copy */
    }
  }
  listeners.forEach((l) => l());
}

export function getWatchlist(): WatchlistEntry[] {
  return read();
}

export function isSaved(symbol: string): boolean {
  const s = norm(symbol);
  return read().some((e) => e.symbol === s);
}

export function saveSignal(entry: WatchlistEntry): void {
  const s = norm(entry.symbol);
  const next = read().filter((e) => e.symbol !== s);
  next.unshift({ ...entry, symbol: s });
  write(next);
}

export function removeSignal(symbol: string): void {
  const s = norm(symbol);
  write(read().filter((e) => e.symbol !== s));
}

/** Toggle: save if absent, remove if present. */
export function toggleSignal(entry: WatchlistEntry): void {
  if (isSaved(entry.symbol)) removeSignal(entry.symbol);
  else saveSignal(entry);
}

export function clearWatchlist(): void {
  write([]);
}

export function subscribeWatchlist(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** React hook returning the live watchlist, re-rendering on any change. */
export function useWatchlist(): WatchlistEntry[] {
  const [list, setList] = useState<WatchlistEntry[]>([]);
  useEffect(() => {
    setList(read());
    return subscribeWatchlist(() => setList(read()));
  }, []);
  return list;
}
