import { fetchNSE } from "../nse/fetch.js";
// NSE's public site APIs for current / upcoming / latest / closed IPOs,
// mainline (EQ) and SME variants. They require the browser-like session that
// fetchNSE already establishes.
const NSE_IPO_PATHS = {
    current: ["/api/ipo-current", "/api/sme/ipo-current"],
    upcoming: ["/api/ipo-upcoming", "/api/sme/ipo-upcoming"],
    latest: ["/api/ipo-latest", "/api/sme/ipo-latest"],
    closed: ["/api/ipo-closed", "/api/sme/ipo-closed"],
};
const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
export function parsePriceBand(raw) {
    if (!raw)
        return null;
    const cleaned = raw.replace(/[₹,\s]/g, "");
    const nums = cleaned.match(/\d+(?:\.\d+)?/g);
    if (!nums || nums.length === 0)
        return null;
    const values = nums.map(Number);
    if (values.length === 1) {
        return { min: values[0], max: values[0], kind: "FIXED", raw: raw.trim() };
    }
    const min = Math.min(values[0], values[1]);
    const max = Math.max(values[0], values[1]);
    return { min, max, kind: "BAND", raw: raw.trim() };
}
export function parseDate(raw) {
    if (!raw)
        return null;
    const m = String(raw).match(/(\d{1,2})[-/ ]?([A-Za-z]{3})[-/ ]?(\d{4})/);
    if (!m)
        return null;
    const d = parseInt(m[1], 10);
    const mo = MONTHS[m[2].toLowerCase()];
    const y = parseInt(m[3], 10);
    if (mo === undefined || !Number.isFinite(d) || !Number.isFinite(y))
        return null;
    const dt = new Date(Date.UTC(y, mo, d));
    if (Number.isNaN(dt.getTime()))
        return null;
    return dt.toISOString().slice(0, 10);
}
export function parseSizeCr(raw) {
    if (!raw)
        return null;
    const m = String(raw).match(/([\d,]+(?:\.\d+)?)\s*Cr/i);
    if (!m)
        return null;
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
}
export function parseCount(raw) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}
export async function fetchNseIpos(status = "current") {
    const statuses = status === "all"
        ? ["current", "upcoming", "latest", "closed"]
        : [status];
    const paths = statuses.flatMap((s) => NSE_IPO_PATHS[s] ?? []);
    const batches = await Promise.all(paths.map(async (p) => {
        try {
            const res = await fetchNSE(p);
            return res.data ?? [];
        }
        catch {
            return [];
        }
    }));
    const records = batches.flat();
    return records.map((r) => {
        const type = String(r.dataType ?? "").toUpperCase() === "SME" ? "SME" : "Mainline";
        const exchange = String(r.exchangeCode ?? r.ipoExchange ?? "NSE").toUpperCase();
        return {
            companyName: String(r.companyName ?? "Unknown").trim(),
            symbol: r.symbol ? String(r.symbol).trim() : null,
            isin: r.isin ? String(r.isin).trim() : null,
            exchange,
            type,
            issueType: r.issueType ? String(r.issueType) : null,
            priceBand: parsePriceBand(r.issuePrice),
            issueSizeCr: parseSizeCr(r.issueSize),
            lotSize: parseCount(r.lotSize),
            faceValue: parseCount(r.faceValue),
            openDate: parseDate(r.ipoOpenDate),
            closeDate: parseDate(r.ipoCloseDate),
            listingDate: parseDate(r.listingDate),
            allotmentDate: parseDate(r.allotmentDate),
            gmp: null,
            gmpPercent: null,
            gmpAsOf: null,
            subscription: null,
            financials: null,
            drhpLink: null,
            dataSource: "NSE",
        };
    });
}
//# sourceMappingURL=nse.js.map