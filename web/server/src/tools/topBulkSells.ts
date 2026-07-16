import { getBulkDeals } from "./bulkDeals.js";
import type { BulkDeal } from "../types.js";

export interface TopBulkSellsArgs {
  /** Number of top results to return. Default: 10. */
  limit?: number;
  symbol?: string;
}

export async function getTopBulkSells(args: TopBulkSellsArgs = {}): Promise<BulkDeal[]> {
  const limit = Math.max(1, args.limit ?? 10);
  const deals = await getBulkDeals({ symbol: args.symbol, dealType: "SELL" });
  return deals
    .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
    .slice(0, limit);
}
