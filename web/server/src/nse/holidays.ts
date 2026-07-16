import { fetchNSE } from "./fetch.js";

export interface MarketHoliday {
  market: string;
  date: string;
  day: string;
  description: string;
}

interface HolidayRow {
  tradingDate?: string;
  date?: string;
  weekDay?: string;
  day?: string;
  description?: string;
  [k: string]: unknown;
}

/**
 * NSE trading/settlement holidays.
 * Verified endpoint: /api/holiday-master?type=trading
 * Response is keyed by market segment (CM, FO, CD, ...), each an array of
 * { tradingDate, weekDay, description }.
 */
export async function getHolidays(year?: number): Promise<MarketHoliday[]> {
  const y = year ?? new Date().getFullYear();
  const resp = await fetchNSE<Record<string, HolidayRow[]>>(
    "/api/holiday-master?type=trading",
  );
  const out: MarketHoliday[] = [];
  for (const [market, list] of Object.entries(resp ?? {})) {
    if (!Array.isArray(list)) continue;
    for (const h of list) {
      const date = String(h.tradingDate ?? h.date ?? "");
      if (!date.includes(String(y))) continue;
      out.push({
        market,
        date,
        day: String(h.weekDay ?? h.day ?? ""),
        description: String(h.description ?? ""),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
