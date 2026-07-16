import { fetchNSE } from "../nse/fetch.js";
function parseRow(row) {
    const symbol = (row.symbol ?? "").trim().toUpperCase();
    if (!symbol)
        return null;
    const rawType = (row.buySell ?? "").trim().toUpperCase();
    const dealType = rawType === "S" || rawType === "SELL" ? "SELL" : "BUY";
    const qty = Number(row.qty ?? 0);
    const price = Number(row.watp ?? 0);
    return {
        date: (row.date ?? "").trim(),
        symbol,
        name: (row.name ?? "").trim(),
        clientName: (row.clientName ?? "").trim(),
        dealType,
        quantity: qty,
        price,
        remarks: (row.remarks ?? "").trim() || undefined,
    };
}
export async function getBulkDeals(args = {}) {
    const resp = await fetchNSE("/api/snapshot-capital-market-largedeal");
    const rows = resp.BULK_DEALS_DATA ?? [];
    const deals = rows.flatMap((r) => {
        const deal = parseRow(r);
        return deal ? [deal] : [];
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
//# sourceMappingURL=bulkDeals.js.map