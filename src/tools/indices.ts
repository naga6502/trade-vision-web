import { fetchNSE } from "../nse/fetch.js";
import type { NseIndex } from "../types.js";

export interface IndicesArgs {
  /** Filter by index name (partial, case-insensitive). E.g. "NIFTY 50", "BANK". */
  name?: string;
}

interface NseIndexRow {
  key?: string;
  index?: string;
  indexSymbol?: string;
  last?: number | string;
  variation?: number | string;
  percentChange?: number | string;
  open?: number | string;
  high?: number | string;
  low?: number | string;
  previousClose?: number | string;
  yearHigh?: number | string;
  yearLow?: number | string;
  advances?: number | string;
  declines?: number | string;
  unchanged?: number | string;
}

interface NseAllIndicesResponse {
  data?: NseIndexRow[];
}

function parseRow(row: NseIndexRow): NseIndex {
  return {
    key: (row.key ?? "").trim(),
    name: (row.index ?? row.indexSymbol ?? "").trim(),
    lastPrice: Number(row.last ?? 0),
    variation: Number(row.variation ?? 0),
    percentChange: Number(row.percentChange ?? 0),
    open: Number(row.open ?? 0),
    high: Number(row.high ?? 0),
    low: Number(row.low ?? 0),
    previousClose: Number(row.previousClose ?? 0),
    yearHigh: Number(row.yearHigh ?? 0),
    yearLow: Number(row.yearLow ?? 0),
    advances: Number(row.advances ?? 0),
    declines: Number(row.declines ?? 0),
    unchanged: Number(row.unchanged ?? 0),
  };
}

export async function getNiftyIndices(args: IndicesArgs = {}): Promise<NseIndex[]> {
  const resp = await fetchNSE<NseAllIndicesResponse>("/api/allIndices", {
    ttlMs: 60_000,
  });
  const indices = (resp.data ?? []).map(parseRow);

  const nameFilter = args.name?.trim().toUpperCase();
  if (!nameFilter) return indices;
  return indices.filter((i) => i.name.toUpperCase().includes(nameFilter));
}
