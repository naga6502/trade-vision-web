import { fetchNSE } from "./fetch.js";
/**
 * Historical India VIX (volatility index) via NSE's chart-data API.
 * Verified endpoint: /api/chart-databyindex?index=INDIAVIX&indices=true
 * Field names inside grapthData vary, so parsing is defensive.
 */
export async function getVixHistorical(from, to) {
    const path = `/api/chart-databyindex?index=INDIAVIX&indices=true&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const resp = await fetchNSE(path);
    const rows = resp?.grapthData ?? [];
    return rows
        .map((r) => ({
        date: String(r.dte ?? r.date ?? r.time ?? ""),
        close: Number(r.vix ?? r.closePrice ?? r.chp ?? r.val ?? 0),
    }))
        .filter((p) => p.date && p.close > 0);
}
//# sourceMappingURL=vix.js.map