import { getBulkDeals } from "./bulkDeals.js";
import { getBlockDeals } from "./blockDeals.js";
import { getInsiderTrading } from "./insiderTrading.js";
import { getAnnouncements } from "./announcements.js";
import type { BulkDeal, BlockDeal, InsiderTrade, NseAnnouncement } from "../types.js";

export interface SearchBySymbolArgs {
  /** NSE stock symbol, e.g. "RELIANCE", "TCS". Required. */
  symbol: string;
  /** Look back N days for insider trades and announcements. Default: 30. */
  daysBack?: number;
}

export interface SymbolSummary {
  symbol: string;
  bulkDeals: BulkDeal[];
  blockDeals: BlockDeal[];
  insiderTrades: InsiderTrade[];
  announcements: NseAnnouncement[];
}

export async function searchBySymbol(args: SearchBySymbolArgs): Promise<SymbolSummary> {
  const symbol = (args.symbol ?? "").trim().toUpperCase();
  if (!symbol) throw new Error("symbol is required");

  const daysBack = args.daysBack ?? 30;
  const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [bulkDeals, blockDeals, insiderTrades, announcements] = await Promise.all([
    getBulkDeals({ symbol }),
    getBlockDeals({ symbol }),
    getInsiderTrading({ symbol, fromDate }),
    getAnnouncements({ symbol, daysBack }),
  ]);

  return { symbol, bulkDeals, blockDeals, insiderTrades, announcements };
}
