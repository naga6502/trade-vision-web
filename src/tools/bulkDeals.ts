import { fetchNSE } from "../nse/fetch.js";
import type { BulkDeal } from "../types.js";

export interface BulkDealsArgs {
  symbol?: string;
  dealType?: "BUY" | "SELL" | "ALL";
}

interface NseBulkDealRow {
  mktType?: string;
  BSECode?: string;
  NSESymbol?: string;
  SCRIP_NAME?: string;
  CLIENT_NAME?: string;
  BUY_SELL?: string;
  NO_OF_SHARES?: number | string;
  "TRADE_PRICE_/_WGHT_AVG_PRICE"?: number | string;
  REMARKS?: string;
}

interface NseBulkDealsResponse {
  date?: string;
  data?: NseBulkDealRow[];
}

function parseRow(row: NseBulkDealRow, date: string): BulkDeal | null {
  const symbol = (row.NSESymbol ?? "").trim().toUpperCase();
  if (!symbol) return null;
  const rawType = (row.BUY_SELL ?? "").trim().toUpperCase();
  const dealType = rawType === "S" || rawType === "SELL" ? "SELL" : "BUY";
  const qty = Number(row.NO_OF_SHARES ?? 0);
  const price = Number(row["TRADE_PRICE_/_WGHT_AVG_PRICE"] ?? 0);
  return {
    date,
    symbol,
    name: (row.SCRIP_NAME ?? "").trim(),
    clientName: (row.CLIENT_NAME ?? "").trim(),
    dealType,
    quantity: qty,
    price,
    remarks: (row.REMARKS ?? "").trim() || undefined,
  };
}

export async function getBulkDeals(args: BulkDealsArgs = {}): Promise<BulkDeal[]> {
  const resp = await fetchNSE<NseBulkDealsResponse>("/api/bulk-deals");
  const date = resp.date ?? "";
  const rows = resp.data ?? [];

  const deals = rows.flatMap((r) => {
    const deal = parseRow(r, date);
    return deal ? [deal] : [];
  });

  const symbolFilter = args.symbol?.trim().toUpperCase();
  const typeFilter = args.dealType?.toUpperCase();

  return deals.filter((d) => {
    if (symbolFilter && d.symbol !== symbolFilter) return false;
    if (typeFilter && typeFilter !== "ALL" && d.dealType !== typeFilter) return false;
    return true;
  });
}
