import { fetchNSE } from "../nse/fetch.js";
import type { FiiDiiActivity } from "../types.js";

export interface FiiDiiActivityArgs {
  /** Number of recent trading days to return. Default: 10. */
  limit?: number;
}

interface NseFiiDiiRow {
  category?: string;
  date?: string;
  buyValue?: string | number;
  sellValue?: string | number;
  netValue?: string | number;
}

export async function getFiiDiiActivity(args: FiiDiiActivityArgs = {}): Promise<FiiDiiActivity[]> {
  const limit = Math.max(1, args.limit ?? 10);
  const resp = await fetchNSE<NseFiiDiiRow[]>("/api/fiidiiTradeReact");
  
  const rows = resp ?? [];
  
  // Group by date
  const grouped = new Map<string, { fii?: NseFiiDiiRow; dii?: NseFiiDiiRow }>();
  
  for (const row of rows) {
    const date = (row.date ?? "").trim();
    if (!date) continue;
    
    if (!grouped.has(date)) {
      grouped.set(date, {});
    }
    
    const entry = grouped.get(date)!;
    const category = (row.category ?? "").trim().toUpperCase();
    
    if (category === "FII/FPI" || category === "FII") {
      entry.fii = row;
    } else if (category === "DII") {
      entry.dii = row;
    }
  }
  
  // Combine
  const combined: FiiDiiActivity[] = [];
  
  for (const [date, data] of grouped.entries()) {
    combined.push({
      date,
      fiiBuyValue: Number(data.fii?.buyValue ?? 0),
      fiiSellValue: Number(data.fii?.sellValue ?? 0),
      fiiNetValue: Number(data.fii?.netValue ?? 0),
      diiBuyValue: Number(data.dii?.buyValue ?? 0),
      diiSellValue: Number(data.dii?.sellValue ?? 0),
      diiNetValue: Number(data.dii?.netValue ?? 0),
    });
  }
  
  // The API seems to return newest first. Map insertion preserves order.
  return combined.slice(0, limit);
}
