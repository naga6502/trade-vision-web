import { fetchNSE } from "./fetch.js";
/**
 * NSE trading/settlement holidays.
 * Verified endpoint: /api/holiday-master?type=trading
 * Response is keyed by market segment (CM, FO, CD, ...), each an array of
 * { tradingDate, weekDay, description }.
 */
export async function getHolidays(year) {
    const y = year ?? new Date().getFullYear();
    const resp = await fetchNSE("/api/holiday-master?type=trading");
    const out = [];
    for (const [market, list] of Object.entries(resp ?? {})) {
        if (!Array.isArray(list))
            continue;
        for (const h of list) {
            const date = String(h.tradingDate ?? h.date ?? "");
            if (!date.includes(String(y)))
                continue;
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
//# sourceMappingURL=holidays.js.map