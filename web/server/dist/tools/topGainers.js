import { fetchNSE } from "../nse/fetch.js";
function parseRow(row) {
    return {
        symbol: (row.symbol ?? "").trim().toUpperCase(),
        series: (row.series ?? "EQ").trim(),
        open: Number(row.open_price ?? 0),
        dayHigh: Number(row.high_price ?? 0),
        dayLow: Number(row.low_price ?? 0),
        lastPrice: Number(row.ltp ?? 0),
        previousClose: Number(row.prev_price ?? 0),
        change: Number(row.net_price ?? 0),
        pChange: Number(row.perChange ?? 0),
        totalTradedVolume: Number(row.trade_quantity ?? 0),
        totalTradedValue: Number(row.turnover ?? 0),
        yearHigh: 0,
        yearLow: 0,
        perChange365d: 0,
    };
}
// NSE's live-analysis-variations groups results by category. Map a user's
// `index` hint to one of those categories when possible.
const CATEGORY_MAP = {
    NIFTY50: "NIFTY",
    NIFTY: "NIFTY",
    BANKNIFTY: "BANKNIFTY",
    NIFTYNEXT50: "NIFTYNEXT50",
    FO: "FOSec",
    FUTURES: "FOSec",
};
function pickRows(resp, index) {
    if (index) {
        const key = index.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cat = CATEGORY_MAP[key];
        const bucket = cat ? resp[cat] : undefined;
        if (bucket?.data?.length)
            return bucket.data;
    }
    const all = resp.allSec;
    if (all?.data?.length)
        return all.data;
    // Fallback: merge every category's data array.
    return Object.values(resp).flatMap((b) => {
        const data = b?.data;
        return Array.isArray(data) ? data : [];
    });
}
export async function getTopGainers(args = {}) {
    const limit = Math.max(1, args.limit ?? 10);
    const resp = await fetchNSE("/api/live-analysis-variations?index=gainers", { ttlMs: 60_000 });
    return pickRows(resp, args.index)
        .map(parseRow)
        .filter((s) => s.pChange > 0)
        .sort((a, b) => b.pChange - a.pChange)
        .slice(0, limit);
}
//# sourceMappingURL=topGainers.js.map