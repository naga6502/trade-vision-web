import { fetchNSE } from "../nse/fetch.js";
function parseRow(row) {
    return {
        key: (row.key ?? "").trim(),
        name: (row.index ?? row.indexSymbol ?? "").trim(),
        lastPrice: Number(row.last ?? 0),
        variation: Number(row.variation ?? 0),
        percentChange: Number(row.percentChange ?? 0),
        open: Number(row.open ?? 0),
        high: Number(row.high ?? 0),
        low: Number(row.low ?? 0),
        previousClose: Number(row.previousClose ?? 0),
        yearHigh: Number(row.yearHigh ?? 0),
        yearLow: Number(row.yearLow ?? 0),
        advances: Number(row.advances ?? 0),
        declines: Number(row.declines ?? 0),
        unchanged: Number(row.unchanged ?? 0),
    };
}
export async function getNiftyIndices(args = {}) {
    const resp = await fetchNSE("/api/allIndices", {
        ttlMs: 60_000,
    });
    const indices = (resp.data ?? []).map(parseRow);
    const nameFilter = args.name?.trim().toUpperCase();
    if (!nameFilter)
        return indices;
    return indices.filter((i) => i.name.toUpperCase().includes(nameFilter));
}
//# sourceMappingURL=indices.js.map