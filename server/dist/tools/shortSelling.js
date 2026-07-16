import { fetchNSE } from "../nse/fetch.js";
export async function getShortSelling(args = {}) {
    const resp = await fetchNSE("/api/snapshot-capital-market-largedeal");
    const rows = resp.SHORT_DEALS_DATA ?? [];
    const symbolFilter = args.symbol?.trim().toUpperCase();
    const parsed = rows
        .map((r) => ({
        symbol: (r.symbol ?? "").trim().toUpperCase(),
        quantitySold: Number(r.qty ?? 0),
        quantityInSecondLeg: 0, // Not available in snapshot
    }))
        .filter((d) => d.symbol && (!symbolFilter || d.symbol === symbolFilter))
        .sort((a, b) => b.quantitySold - a.quantitySold);
    if (args.limit && args.limit > 0)
        return parsed.slice(0, args.limit);
    return parsed;
}
//# sourceMappingURL=shortSelling.js.map