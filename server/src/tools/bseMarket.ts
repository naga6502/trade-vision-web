import { fetchBSE } from "../bse/bse.js";

// VERIFY: BSE JSON endpoints below are best-effort and were NOT confirmed
// during development (BSE blocks programmatic access from this build
// environment with a Cloudflare page). Adjust the PATH constants on first
// live run. Parsing is defensive so a working endpoint drops straight in,
// and every function returns [] / null on any failure so the UI degrades
// gracefully.

const BSE_QUOTE_PATH = (scrip: string) =>
  `/stock-shark/charting/StockChartData.aspx?Type=R&text=${encodeURIComponent(scrip)}`;
// TODO: confirm BSE gainers/losers/advance-decline/near-52w/result-calendar
// JSON endpoints on first live run.
const BSE_GAINERS_PATH = "/markets/Equity/EQReports/BhavCopy.aspx?expandable=0";
const BSE_RESULT_CALENDAR_PATH = "/corporates/corporate-action";

export interface BseQuote {
  scrip: string;
  lastPrice: number;
  previousClose: number;
  change: number;
  pChange: number;
}

export async function getBseQuote(scrip: string): Promise<BseQuote | null> {
  try {
    const data = await fetchBSE<any>(BSE_QUOTE_PATH(scrip), { ttlMs: 0 });
    const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
    const last = num(data?.ltp ?? data?.lastPrice ?? (Object.values(data ?? {})[0] as any)?.ltp);
    const prev = num(data?.prevClose ?? (Object.values(data ?? {})[0] as any)?.prevClose);
    return {
      scrip: scrip.toUpperCase(),
      lastPrice: last,
      previousClose: prev,
      change: last - prev,
      pChange: prev ? ((last - prev) / prev) * 100 : 0,
    };
  } catch {
    return null;
  }
}

export interface BseMover {
  scrip: string;
  name: string;
  lastPrice: number;
  pChange: number;
}

function moversFrom(data: any): BseMover[] {
  const rows: any[] = Array.isArray(data) ? data : data?.data ?? [];
  return rows
    .map((r) => ({
      scrip: String(r.scrip ?? r.symbol ?? ""),
      name: String(r.name ?? r.company ?? ""),
      lastPrice: Number(r.lastPrice ?? r.ltp ?? 0),
      pChange: Number(r.pChange ?? r.changePct ?? 0),
    }))
    .filter((m) => m.scrip);
}

export async function getBseGainers(): Promise<BseMover[]> {
  try {
    return moversFrom(await fetchBSE<any>(BSE_GAINERS_PATH, { ttlMs: 0 }));
  } catch {
    return [];
  }
}

export async function getBseLosers(): Promise<BseMover[]> {
  try {
    return moversFrom(await fetchBSE<any>(BSE_GAINERS_PATH, { ttlMs: 0 })).sort(
      (a, b) => a.pChange - b.pChange,
    );
  } catch {
    return [];
  }
}

export interface BseAdvanceDecline {
  index: string;
  advances: number;
  declines: number;
  unchanged: number;
}

export async function getBseAdvanceDecline(): Promise<BseAdvanceDecline[]> {
  try {
    const data = await fetchBSE<any>(BSE_GAINERS_PATH, { ttlMs: 0 });
    const rows: any[] = Array.isArray(data) ? data : data?.data ?? [];
    return rows.map((r) => ({
      index: String(r.index ?? r.name ?? ""),
      advances: Number(r.advances ?? 0),
      declines: Number(r.declines ?? 0),
      unchanged: Number(r.unchanged ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getBseResultCalendar(): Promise<any[]> {
  try {
    const data = await fetchBSE<any>(BSE_RESULT_CALENDAR_PATH, { ttlMs: 0 });
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch {
    return [];
  }
}
