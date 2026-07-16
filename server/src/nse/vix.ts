import { fetchNSE } from "./fetch.js";

export interface VixPoint {
  date: string;
  close: number;
}

interface ChartRow {
  dte?: string;
  date?: string;
  time?: string;
  vix?: number;
  closePrice?: number;
  chp?: number;
  val?: number;
  [k: string]: unknown;
}

/**
 * Historical India VIX (volatility index) via NSE's chart-data API.
 * Verified endpoint: /api/chart-databyindex?index=INDIAVIX&indices=true
 * Field names inside grapthData vary, so parsing is defensive.
 */
export async function getVixHistorical(
  from: string,
  to: string,
): Promise<VixPoint[]> {
  const path = `/api/chart-databyindex?index=INDIAVIX&indices=true&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const resp = await fetchNSE<{ grapthData?: ChartRow[] }>(path);
  const rows = resp?.grapthData ?? [];
  return rows
    .map((r) => ({
      date: String(r.dte ?? r.date ?? r.time ?? ""),
      close: Number(r.vix ?? r.closePrice ?? r.chp ?? r.val ?? 0),
    }))
    .filter((p) => p.date && p.close > 0);
}
