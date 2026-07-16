import { fetchNSE } from "../nse/fetch.js";
export async function getMarketStatus() {
    const resp = await fetchNSE("/api/marketStatus", {
        ttlMs: 30_000,
    });
    return (resp.marketState ?? []).map((item) => ({
        market: (item.market ?? "").trim(),
        marketStatus: (item.marketStatus ?? "").trim(),
        tradeDate: (item.tradeDate ?? "").trim(),
        index: (item.index ?? "").trim(),
        last: Number(item.last ?? 0),
        variation: Number(item.variation ?? 0),
        percentChange: Number(item.percentChange ?? 0),
        marketStatusMessage: (item.marketStatusMessage ?? "").trim(),
    }));
}
//# sourceMappingURL=marketStatus.js.map