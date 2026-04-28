import { fetchNSE } from "../nse/fetch.js";
import type { FiiDiiActivity } from "../types.js";

export interface FiiDiiActivityArgs {
  /** Number of recent trading days to return. Default: 10. */
  limit?: number;
}

interface NseFiiDiiRow {
  date?: string;
  fiiBuyValue?: number | string;
  fiiSellValue?: number | string;
  fiiNetValue?: number | string;
  diiBuyValue?: number | string;
  diiSellValue?: number | string;
  diiNetValue?: number | string;
}

interface NseFiiDiiResponse {
  data?: NseFiiDiiRow[];
}

function parseRow(row: NseFiiDiiRow): FiiDiiActivity {
  return {
    date: (row.date ?? "").trim(),
    fiiBuyValue: Number(row.fiiBuyValue ?? 0),
    fiiSellValue: Number(row.fiiSellValue ?? 0),
    fiiNetValue: Number(row.fiiNetValue ?? 0),
    diiBuyValue: Number(row.diiBuyValue ?? 0),
    diiSellValue: Number(row.diiSellValue ?? 0),
    diiNetValue: Number(row.diiNetValue ?? 0),
  };
}

export async function getFiiDiiActivity(args: FiiDiiActivityArgs = {}): Promise<FiiDiiActivity[]> {
  const limit = Math.max(1, args.limit ?? 10);
  const resp = await fetchNSE<NseFiiDiiResponse>("/api/fiidiiTradeReact");
  const rows = (resp.data ?? []).map(parseRow);
  // NSE returns newest first; keep that order and slice
  return rows.slice(0, limit);
}
