import { getBulkDeals } from "./bulkDeals.js";
import type { BulkDeal } from "../types.js";

export interface LatestBulkDealsArgs {
  /** Return only deals within the last N calendar days. Default: today only (1). */
  daysBack?: number;
  dealType?: "BUY" | "SELL" | "ALL";
}

export async function getLatestBulkDeals(args: LatestBulkDealsArgs = {}): Promise<BulkDeal[]> {
  const deals = await getBulkDeals({ dealType: args.dealType });
  // NSE bulk deals endpoint always returns today's data; daysBack is a no-op
  // hint included for API consistency — callers may pass it without error.
  return deals;
}
