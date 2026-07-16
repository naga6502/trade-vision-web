import { fetchNSE } from "../nse/fetch.js";
import type { NseStock } from "../types.js";

export interface TopGainersArgs {
  /**
   * Market segment to scan. Maps to a category from the NSE live-analysis
   * endpoint (NIFTY, BANKNIFTY, NIFTYNEXT50, FOSec). Omit for all securities.
   * Default: all securities.
   */
  index?: string;
  /** Number of top results to return. Default: 10. */
  limit?: number;
}

interface NseVariationRow {
  symbol?: string;
  series?: string;
  open_price?: number | string;
  high_price?: number | string;
  low_price?: number | string;
  ltp?: number | string;
  prev_price?: number | string;
  net_price?: number | string;
  trade_quantity?: number | string;
  turnover?: number | string;
  perChange?: number | string;
}

interface NseVariationResponse {
  [category: string]: { data?: NseVariationRow[] } | unknown;
}

function parseRow(row: NseVariationRow): NseStock {
  return {
    symbol: (row.symbol ?? "").trim().toUpperCase(),
    series: (row.series ?? "EQ").trim(),
    open: Number(row.open_price ?? 0),
    dayHigh: Number(row.high_price ?? 0),
    dayLow: Number(row.low_price ?? 0),
    lastPrice: Number(row.ltp ?? 0),
    previousClose: Number(row.prev_price ?? 0),
    change: Number(row.net_price ?? 0),
    pChange: Number(row.perChange ?? 0),
    totalTradedVolume: Number(row.trade_quantity ?? 0),
    totalTradedValue: Number(row.turnover ?? 0),
    yearHigh: 0,
    yearLow: 0,
    perChange365d: 0,
  };
}

// NSE's live-analysis-variations groups results by category. Map a user's
// `index` hint to one of those categories when possible.
const CATEGORY_MAP: Record<string, string> = {
  NIFTY50: "NIFTY",
  NIFTY: "NIFTY",
  BANKNIFTY: "BANKNIFTY",
  NIFTYNEXT50: "NIFTYNEXT50",
  FO: "FOSec",
  FUTURES: "FOSec",
};

function pickRows(resp: NseVariationResponse, index?: string): NseVariationRow[] {
  if (index) {
    const key = index.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cat = CATEGORY_MAP[key];
    const bucket = cat ? (resp[cat] as { data?: NseVariationRow[] } | undefined) : undefined;
    if (bucket?.data?.length) return bucket.data;
  }
  const all = resp.allSec as { data?: NseVariationRow[] } | undefined;
  if (all?.data?.length) return all.data;
  // Fallback: merge every category's data array.
  return Object.values(resp).flatMap((b) => {
    const data = (b as { data?: NseVariationRow[] } | undefined)?.data;
    return Array.isArray(data) ? data : [];
  });
}

export async function getTopGainers(args: TopGainersArgs = {}): Promise<NseStock[]> {
  const limit = Math.max(1, args.limit ?? 10);
  const resp = await fetchNSE<NseVariationResponse>(
    "/api/live-analysis-variations?index=gainers",
    { ttlMs: 60_000 }
  );
  return pickRows(resp, args.index)
    .map(parseRow)
    .filter((s) => s.pChange > 0)
    .sort((a, b) => b.pChange - a.pChange)
    .slice(0, limit);
}
