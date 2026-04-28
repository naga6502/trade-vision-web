import { fetchNSE } from "../nse/fetch.js";
import type { NseStock } from "../types.js";

export interface MostActiveArgs {
  /**
   * NSE index to scan. Default: "NIFTY 500".
   * Other options: "NIFTY 50", "NIFTY NEXT 50", "NIFTY BANK", etc.
   */
  index?: string;
  /** Number of top results to return. Default: 10. */
  limit?: number;
}

interface NseEquityRow {
  symbol?: string;
  series?: string;
  open?: number | string;
  dayHigh?: number | string;
  dayLow?: number | string;
  lastPrice?: number | string;
  previousClose?: number | string;
  change?: number | string;
  pChange?: number | string;
  totalTradedVolume?: number | string;
  totalTradedValue?: number | string;
  yearHigh?: number | string;
  yearLow?: number | string;
  perChange365d?: number | string;
}

interface NseEquityResponse {
  data?: NseEquityRow[];
}

function parseRow(row: NseEquityRow): NseStock {
  return {
    symbol: (row.symbol ?? "").trim().toUpperCase(),
    series: (row.series ?? "EQ").trim(),
    open: Number(row.open ?? 0),
    dayHigh: Number(row.dayHigh ?? 0),
    dayLow: Number(row.dayLow ?? 0),
    lastPrice: Number(row.lastPrice ?? 0),
    previousClose: Number(row.previousClose ?? 0),
    change: Number(row.change ?? 0),
    pChange: Number(row.pChange ?? 0),
    totalTradedVolume: Number(row.totalTradedVolume ?? 0),
    totalTradedValue: Number(row.totalTradedValue ?? 0),
    yearHigh: Number(row.yearHigh ?? 0),
    yearLow: Number(row.yearLow ?? 0),
    perChange365d: Number(row.perChange365d ?? 0),
  };
}

export async function getMostActive(args: MostActiveArgs = {}): Promise<NseStock[]> {
  const index = args.index ?? "NIFTY 500";
  const limit = Math.max(1, args.limit ?? 10);
  const path = `/api/equity-stockIndices?index=${encodeURIComponent(index)}`;

  const resp = await fetchNSE<NseEquityResponse>(path, { ttlMs: 60_000 });
  const stocks = (resp.data ?? [])
    .filter((r) => (r.symbol ?? "").trim() !== index)
    .map(parseRow);

  return stocks
    .sort((a, b) => b.totalTradedValue - a.totalTradedValue)
    .slice(0, limit);
}
