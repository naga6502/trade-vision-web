import { fetchNSE } from "../nse/fetch.js";
function parseRow(row) {
    return {
        symbol: (row.symbol ?? "").trim().toUpperCase(),
        series: (row.series ?? "EQ").trim(),
        open: Number(row.open ?? 0),
        dayHigh: Number(row.dayHigh ?? 0),
        dayLow: Number(row.dayLow ?? 0),
        lastPrice: Number(row.lastPrice ?? 0),
        previousClose: Number(row.previousClose ?? 0),
        change: Number(row.change ?? 0),
        pChange: Number(row.pChange ?? 0),
        totalTradedVolume: Number(row.totalTradedVolume ?? 0),
        totalTradedValue: Number(row.totalTradedValue ?? 0),
        yearHigh: Number(row.yearHigh ?? 0),
        yearLow: Number(row.yearLow ?? 0),
        perChange365d: Number(row.perChange365d ?? 0),
    };
}
export async function getMostActive(args = {}) {
    const index = args.index ?? "NIFTY 500";
    const limit = Math.max(1, args.limit ?? 10);
    const path = `/api/equity-stockIndices?index=${encodeURIComponent(index)}`;
    const resp = await fetchNSE(path, { ttlMs: 60_000 });
    const stocks = (resp.data ?? [])
        .filter((r) => (r.symbol ?? "").trim() !== index)
        .map(parseRow);
    return stocks
        .sort((a, b) => b.totalTradedValue - a.totalTradedValue)
        .slice(0, limit);
}
//# sourceMappingURL=mostActive.js.map