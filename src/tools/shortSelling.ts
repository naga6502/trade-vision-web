import { fetchNSE } from "../nse/fetch.js";
import type { ShortSellData } from "../types.js";

export interface ShortSellingArgs {
  symbol?: string;
  /** Number of top results by short-sold quantity. Default: no limit. */
  limit?: number;
}

interface NseShortSellRow {
  name?: string;
  shortSoldQuantity?: number | string;
  quantityInSecondLeg?: number | string;
}

interface NseShortSellResponse {
  date?: string;
  data?: NseShortSellRow[];
}

export async function getShortSelling(args: ShortSellingArgs = {}): Promise<ShortSellData[]> {
  const resp = await fetchNSE<NseShortSellResponse>("/api/short-selling");
  const rows = resp.data ?? [];

  const symbolFilter = args.symbol?.trim().toUpperCase();

  const parsed: ShortSellData[] = rows
    .map((r) => ({
      symbol: (r.name ?? "").trim().toUpperCase(),
      quantitySold: Number(r.shortSoldQuantity ?? 0),
      quantityInSecondLeg: Number(r.quantityInSecondLeg ?? 0),
    }))
    .filter((d) => !symbolFilter || d.symbol === symbolFilter)
    .sort((a, b) => b.quantitySold - a.quantitySold);

  if (args.limit && args.limit > 0) return parsed.slice(0, args.limit);
  return parsed;
}
