import YahooFinance from "yahoo-finance2";
import { getTopGainers } from "./topGainers.js";
import { getTopLosers } from "./topLosers.js";
import { NIFTY50_SYMBOLS, NIFTY50_FALLBACK_WEIGHTS } from "./niftyConstituents.js";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface NiftyMover {
  symbol: string;
  lastPrice: number;
  pChange: number;
  weight: number;
}

export interface NiftyMoversResult {
  gainers: NiftyMover[];
  losers: NiftyMover[];
  asOf: string;
  /** True when weights came from the static fallback (live mcap fetch failed). */
  fallbackWeights: boolean;
}

export interface NiftyMoversArgs {
  limit?: number;
}

const WEIGHT_CACHE_TTL_MS = 5 * 60 * 1000;
const CHUNK = 8;
const CHUNK_DELAY_MS = 150;

let weightCache: { at: number; caps: Map<string, number>; ok: boolean } | null = null;

async function chunked<T, R>(
  items: T[],
  size: number,
  delayMs: number,
  fn: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    out.push(...(await fn(batch)));
    if (i + size < items.length) await new Promise((r) => setTimeout(r, delayMs));
  }
  return out;
}

async function fetchMarketCaps(): Promise<{ caps: Map<string, number>; ok: boolean }> {
  if (weightCache && Date.now() - weightCache.at < WEIGHT_CACHE_TTL_MS) {
    return { caps: weightCache.caps, ok: weightCache.ok };
  }
  const caps = new Map<string, number>();
  let failures = 0;
  await chunked(NIFTY50_SYMBOLS, CHUNK, CHUNK_DELAY_MS, async (batch) => {
    await Promise.all(
      batch.map(async (sym) => {
        try {
          const r = await yahooFinance.quote(`${sym}.NS`);
          const mc = typeof r.marketCap === "number" ? r.marketCap : 0;
          if (mc > 0) caps.set(sym, mc);
          else failures++;
        } catch {
          failures++;
        }
      }),
    );
    return [] as number[];
  });
  const ok = caps.size >= Math.floor(NIFTY50_SYMBOLS.length * 0.8);
  weightCache = { at: Date.now(), caps, ok };
  return { caps, ok };
}

function weightFor(
  symbol: string,
  caps: Map<string, number>,
  liveOk: boolean,
  totalLive: number,
): number {
  if (liveOk && totalLive > 0) {
    const mc = caps.get(symbol) ?? 0;
    return totalLive > 0 ? (mc / totalLive) * 100 : 0;
  }
  return NIFTY50_FALLBACK_WEIGHTS[symbol] ?? 0;
}

export async function getNiftyMovers(args: NiftyMoversArgs = {}): Promise<NiftyMoversResult> {
  const limit = Math.max(1, args.limit ?? 8);

  const [gainers, losers, mcap] = await Promise.all([
    getTopGainers({ index: "NIFTY50", limit }),
    getTopLosers({ index: "NIFTY50", limit }),
    fetchMarketCaps(),
  ]);

  let totalLive = 0;
  if (mcap.ok) {
    for (const v of mcap.caps.values()) totalLive += v;
  }
  const liveOk = mcap.ok && totalLive > 0;

  const map = (s: { symbol: string; lastPrice: number; pChange: number }): NiftyMover => ({
    symbol: s.symbol,
    lastPrice: s.lastPrice,
    pChange: s.pChange,
    weight: Number(weightFor(s.symbol, mcap.caps, liveOk, totalLive).toFixed(2)),
  });

  return {
    gainers: gainers.map(map),
    losers: losers.map(map),
    asOf: new Date().toISOString(),
    fallbackWeights: !liveOk,
  };
}
