import { fetchNSE } from "../nse/fetch.js";
import type { MarketStatusItem } from "../types.js";

interface NseMarketStateItem {
  market?: string;
  marketStatus?: string;
  tradeDate?: string;
  index?: string;
  last?: number | string;
  variation?: number | string;
  percentChange?: number | string;
  marketStatusMessage?: string;
}

interface NseMarketStatusResponse {
  marketState?: NseMarketStateItem[];
}

export async function getMarketStatus(): Promise<MarketStatusItem[]> {
  const resp = await fetchNSE<NseMarketStatusResponse>("/api/marketStatus", {
    ttlMs: 30_000,
  });
  return (resp.marketState ?? []).map((item) => ({
    market: (item.market ?? "").trim(),
    marketStatus: (item.marketStatus ?? "").trim(),
    tradeDate: (item.tradeDate ?? "").trim(),
    index: (item.index ?? "").trim(),
    last: Number(item.last ?? 0),
    variation: Number(item.variation ?? 0),
    percentChange: Number(item.percentChange ?? 0),
    marketStatusMessage: (item.marketStatusMessage ?? "").trim(),
  }));
}
