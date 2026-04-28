import { fetchNSE } from "../nse/fetch.js";
import type { BlockDeal } from "../types.js";

export interface BlockDealsArgs {
  symbol?: string;
  dealType?: "BUY" | "SELL" | "ALL";
}

interface NseBlockDealRow {
  NSESymbol?: string;
  SCRIP_NAME?: string;
  CLIENT_NAME?: string;
  BUY_SELL?: string;
  NO_OF_SHARES?: number | string;
  TRADE_PRICE?: number | string;
}

interface NseBlockDealsResponse {
  date?: string;
  data?: NseBlockDealRow[];
}

function parseRow(row: NseBlockDealRow, date: string): BlockDeal | null {
  const symbol = (row.NSESymbol ?? "").trim().toUpperCase();
  if (!symbol) return null;
  const rawType = (row.BUY_SELL ?? "").trim().toUpperCase();
  const dealType = rawType === "S" || rawType === "SELL" ? "SELL" : "BUY";
  return {
    date,
    symbol,
    name: (row.SCRIP_NAME ?? "").trim(),
    clientName: (row.CLIENT_NAME ?? "").trim(),
    dealType,
    quantity: Number(row.NO_OF_SHARES ?? 0),
    price: Number(row.TRADE_PRICE ?? 0),
  };
}

export async function getBlockDeals(args: BlockDealsArgs = {}): Promise<BlockDeal[]> {
  const resp = await fetchNSE<NseBlockDealsResponse>("/api/block-deals");
  const date = resp.date ?? "";
  const rows = resp.data ?? [];

  const deals = rows.flatMap((r) => {
    const d = parseRow(r, date);
    return d ? [d] : [];
  });

  const symbolFilter = args.symbol?.trim().toUpperCase();
  const typeFilter = args.dealType?.toUpperCase();

  return deals.filter((d) => {
    if (symbolFilter && d.symbol !== symbolFilter) return false;
    if (typeFilter && typeFilter !== "ALL" && d.dealType !== typeFilter) return false;
    return true;
  });
}
