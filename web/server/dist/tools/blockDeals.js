import { fetchNSE } from "../nse/fetch.js";
function parseRow(row) {
    const symbol = (row.symbol ?? "").trim().toUpperCase();
    if (!symbol)
        return null;
    const rawType = (row.buySell ?? "").trim().toUpperCase();
    const dealType = rawType === "S" || rawType === "SELL" ? "SELL" : "BUY";
    return {
        date: (row.date ?? "").trim(),
        symbol,
        name: (row.name ?? "").trim(),
        clientName: (row.clientName ?? "").trim(),
        dealType,
        quantity: Number(row.qty ?? 0),
        price: Number(row.watp ?? 0),
    };
}
export async function getBlockDeals(args = {}) {
    const resp = await fetchNSE("/api/snapshot-capital-market-largedeal");
    const rows = resp.BLOCK_DEALS_DATA ?? [];
    const deals = rows.flatMap((r) => {
        const d = parseRow(r);
        return d ? [d] : [];
    });
    const symbolFilter = args.symbol?.trim().toUpperCase();
    const typeFilter = args.dealType?.toUpperCase();
    return deals.filter((d) => {
        if (symbolFilter && d.symbol !== symbolFilter)
            return false;
        if (typeFilter && typeFilter !== "ALL" && d.dealType !== typeFilter)
            return false;
        return true;
    });
}
//# sourceMappingURL=blockDeals.js.map