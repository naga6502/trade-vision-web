import { fetchNSE } from "../nse/fetch.js";
function toNseDateFormat(dateStr) {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (isoMatch)
        return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    return dateStr;
}
function parseRow(row) {
    return {
        symbol: (row.symbol ?? "").trim().toUpperCase(),
        company: (row.comp ?? "").trim(),
        series: (row.series ?? "EQ").trim(),
        faceValue: Number(row.faceVal ?? 0),
        purpose: (row.subject ?? "").trim(),
        exDate: (row.exDate ?? "").trim(),
        recordDate: (row.recDate ?? "").trim(),
        bcStartDate: (row.bcStartDate ?? "").trim(),
        bcEndDate: (row.bcEndDate ?? "").trim(),
        paymentDate: (row.payDate ?? "").trim(),
        remarks: (row.remarks ?? "").trim(),
    };
}
export async function getCorporateActions(args = {}) {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const from = toNseDateFormat(args.fromDate ?? threeMonthsAgo.toISOString().slice(0, 10));
    const to = toNseDateFormat(args.toDate ?? today.toISOString().slice(0, 10));
    const path = `/api/corporates-corporateActions?index=equities&from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`;
    const resp = await fetchNSE(path);
    const actions = (resp ?? []).map(parseRow);
    const symbolFilter = args.symbol?.trim().toUpperCase();
    if (symbolFilter)
        return actions.filter((a) => a.symbol === symbolFilter);
    return actions;
}
//# sourceMappingURL=corporateActions.js.map