import { fetchNSE } from "../nse/fetch.js";
import type { ShortSellData } from "../types.js";

export interface ShortSellingArgs {
  symbol?: string;
  /** Number of top results by short-sold quantity. Default: no limit. */
  limit?: number;
}

interface NseShortSellRow {
  date?: string;
  symbol?: string;
  name?: string;
  qty?: string | number;
}

interface NseShortSellResponse {
  SHORT_DEALS_DATA?: NseShortSellRow[];
}

export async function getShortSelling(args: ShortSellingArgs = {}): Promise<ShortSellData[]> {
  const resp = await fetchNSE<NseShortSellResponse>("/api/snapshot-capital-market-largedeal");
  const rows = resp.SHORT_DEALS_DATA ?? [];

  const symbolFilter = args.symbol?.trim().toUpperCase();

  const parsed: ShortSellData[] = rows
    .map((r) => ({
      symbol: (r.symbol ?? "").trim().toUpperCase(),
      quantitySold: Number(r.qty ?? 0),
      quantityInSecondLeg: 0, // Not available in snapshot
    }))
    .filter((d) => d.symbol && (!symbolFilter || d.symbol === symbolFilter))
    .sort((a, b) => b.quantitySold - a.quantitySold);

  if (args.limit && args.limit > 0) return parsed.slice(0, args.limit);
  return parsed;
}
