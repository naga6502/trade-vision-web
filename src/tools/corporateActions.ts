import { fetchNSE } from "../nse/fetch.js";
import type { CorporateAction } from "../types.js";

export interface CorporateActionsArgs {
  symbol?: string;
  /** ISO date string YYYY-MM-DD or DD-MM-YYYY. Default: 3 months ago. */
  fromDate?: string;
  /** ISO date string YYYY-MM-DD or DD-MM-YYYY. Default: today. */
  toDate?: string;
}

interface NseCorpActionRow {
  symbol?: string;
  company?: string;
  series?: string;
  faceVal?: number | string;
  subject?: string;
  exDate?: string;
  recDate?: string;
  bcStDt?: string;
  bcEndDt?: string;
  payDt?: string;
  remarks?: string;
}

interface NseCorpActionsResponse {
  data?: NseCorpActionRow[];
}

function toNseDateFormat(dateStr: string): string {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  return dateStr;
}

function parseRow(row: NseCorpActionRow): CorporateAction {
  return {
    symbol: (row.symbol ?? "").trim().toUpperCase(),
    company: (row.company ?? "").trim(),
    series: (row.series ?? "EQ").trim(),
    faceValue: Number(row.faceVal ?? 0),
    purpose: (row.subject ?? "").trim(),
    exDate: (row.exDate ?? "").trim(),
    recordDate: (row.recDate ?? "").trim(),
    bcStartDate: (row.bcStDt ?? "").trim(),
    bcEndDate: (row.bcEndDt ?? "").trim(),
    paymentDate: (row.payDt ?? "").trim(),
    remarks: (row.remarks ?? "").trim(),
  };
}

export async function getCorporateActions(
  args: CorporateActionsArgs = {},
): Promise<CorporateAction[]> {
  const today = new Date();
  const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  const from = toNseDateFormat(args.fromDate ?? threeMonthsAgo.toISOString().slice(0, 10));
  const to = toNseDateFormat(args.toDate ?? today.toISOString().slice(0, 10));

  const path = `/api/corporates-corpActions?index=equities&from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`;
  const resp = await fetchNSE<NseCorpActionsResponse>(path);
  const actions = (resp.data ?? []).map(parseRow);

  const symbolFilter = args.symbol?.trim().toUpperCase();
  if (symbolFilter) return actions.filter((a) => a.symbol === symbolFilter);
  return actions;
}
