import { fetchNSE } from "../nse/fetch.js";
function toNseDateFormat(dateStr) {
    // Accept YYYY-MM-DD and convert to DD-MM-YYYY
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (isoMatch)
        return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    return dateStr;
}
function parseRow(row) {
    return {
        symbol: (row.symbol ?? "").trim().toUpperCase(),
        company: (row.company ?? "").trim(),
        acquirerName: (row.acqName ?? "").trim(),
        personCategory: (row.personCategory ?? "").trim(),
        typeOfSecurity: (row.secType ?? "").trim(),
        sharesAcquired: Number(row.secAcq ?? 0),
        sharesBefore: Number(row.befAcqSharesNo ?? 0),
        sharesAfter: Number(row.aftAcqSharesNo ?? 0),
        percentBefore: Number(row.befAcqSharesPer ?? 0),
        percentAfter: Number(row.aftAcqSharesPer ?? 0),
        modeOfAcquisition: (row.acqMode ?? "").trim(),
        acquireFromDate: (row.acqfromDt ?? "").trim(),
        acquireToDate: (row.acqtoDt ?? "").trim(),
        intimationDate: (row.intimDt ?? "").trim(),
    };
}
export async function getInsiderTrading(args = {}) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = toNseDateFormat(args.fromDate ?? thirtyDaysAgo.toISOString().slice(0, 10));
    const to = toNseDateFormat(args.toDate ?? today.toISOString().slice(0, 10));
    const symbol = args.symbol?.trim().toUpperCase() ?? "";
    const path = `/api/corporates-pit?symbol=${encodeURIComponent(symbol)}&from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}&type=individual`;
    const resp = await fetchNSE(path);
    const rows = resp.data ?? [];
    const trades = rows.map(parseRow);
    if (symbol) {
        return trades.filter((t) => t.symbol === symbol);
    }
    return trades;
}
//# sourceMappingURL=insiderTrading.js.map