import { fetchHttp } from "../http.js";
// Third-party grey-market / fundamentals enrichment.
//
// NSE/BSE publish authoritative price bands + dates but NOT the grey-market
// premium (GMP), subscription multiples, or issuer financials. Those only
// exist on third-party IPO trackers. Each source below is best-effort: a
// failed fetch or an unrecognised response shape yields `null` and the next
// source is tried. If every source is unreachable the IPO record simply has
// no GMP/financials — the rest of the feature (and the signal) still works.
const AGG_UA = process.env.NSE_MCP_UA ??
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function aggConfig(name) {
    return {
        name,
        userAgent: AGG_UA,
        defaultTtlMs: 15 * 60 * 1000, // GMP moves slowly intraday
        defaultAccept: "application/json, text/html, */*",
        minIntervalMs: 500,
        timeoutMs: 20_000,
    };
}
function num(v) {
    if (v === null || v === undefined || v === "")
        return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : null;
}
function norm(s) {
    return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
// ---------------------------------------------------------------------------
// InvestorGain (JSON)
// ---------------------------------------------------------------------------
const INVESTORGAIN_PATHS = [
    "https://webnodejs.investorgain.com/api/ipo/latest",
    "https://webnodejs.investorgain.com/api/ipo/upcoming",
    "https://webnodejs.investorgain.com/api/ipo/live",
];
function matchRecord(list, symbol, name) {
    if (!Array.isArray(list))
        return null;
    const ns = norm(symbol);
    const nn = norm(name);
    for (const it of list) {
        const s = norm(it.symbol ?? it.sym ?? it.ticker ?? it.ipoSymbol);
        const c = norm(it.companyName ?? it.company ?? it.name ?? it.issuer);
        if ((ns && s && s.includes(ns)) || (nn && c && (c.includes(nn) || nn.includes(c)))) {
            return it;
        }
    }
    return null;
}
function parseSubscription(v) {
    if (!v)
        return null;
    return {
        qib: num(v.qib ?? v.qibSubscription ?? v.qibTimes),
        nii: num(v.nii ?? v.niiSubscription ?? v.hni ?? v.hniTimes ?? v.niiTimes),
        retail: num(v.retail ?? v.retailSubscription ?? v.retailTimes),
        total: num(v.total ?? v.totalSubscription ?? v.overall ?? v.times ?? v.totalTimes),
    };
}
function parseFinancials(v) {
    if (!v)
        return null;
    return {
        revenue: num(v.revenue ?? v.revenueCr ?? v.sales),
        pat: num(v.pat ?? v.profitAfterTax ?? v.netProfit ?? v.profit),
        eps: num(v.eps ?? v.epsDiluted ?? v.dilutedEps),
        peRatio: num(v.peRatio ?? v.pe ?? v.priceToEarnings),
        industryPe: num(v.industryPe ?? v.peerPe ?? v.sectorPe),
        roe: num(v.roe ?? v.returnOnEquity),
        debtEquity: num(v.debtEquity ?? v.debtToEquity ?? v.d2e),
        revenueGrowth: num(v.revenueGrowth ?? v.revenueCagr ?? v.salesGrowth),
        profitGrowth: num(v.profitGrowth ?? v.patGrowth ?? v.profitCagr),
    };
}
function parseInvestorGain(rec) {
    return {
        gmp: num(rec.gmp ?? rec.greyMarketPremium ?? rec.ipoGmp ?? rec.premium),
        gmpPercent: num(rec.gmpPercent ?? rec.gmpPercentage ?? rec.premiumPercent),
        gmpAsOf: rec.gmpDate ?? rec.gmpAsOn ?? rec.asOn ?? null,
        subscription: parseSubscription(rec.subscription ?? rec.subscriptionDetails ?? rec.bidding),
        financials: parseFinancials(rec.financials ?? rec.companyFinancials ?? rec.drhp),
        source: "InvestorGain",
    };
}
const investorGainSource = {
    name: "InvestorGain",
    async fetch(symbol, companyName) {
        for (const path of INVESTORGAIN_PATHS) {
            let text = null;
            try {
                text = await fetchHttp(path, aggConfig("InvestorGain"), { cache: true });
            }
            catch {
                continue;
            }
            if (!text)
                continue;
            let j;
            try {
                j = JSON.parse(text);
            }
            catch {
                continue;
            }
            const list = Array.isArray(j) ? j : j.data ?? j.table ?? j.ipo ?? j.records ?? null;
            if (!list)
                continue;
            const rec = matchRecord(list, symbol, companyName);
            if (rec)
                return parseInvestorGain(rec);
        }
        return null;
    },
};
// ---------------------------------------------------------------------------
// HTML scrapers (IPO Watch / Chittorgarh) — conservative, best-effort
// ---------------------------------------------------------------------------
// Pull a ₹-prefixed GMP figure from the table row that mentions `name`.
// Returns null unless a clear company + rupee value is found, so we never
// invent a GMP we can't confidently attribute.
function extractGmpFromHtml(html, companyName) {
    const nn = norm(companyName);
    if (!nn)
        return null;
    // Split into table rows / list items and scan each for the company name.
    const rows = html.split(/<\/tr>|<\/li>|<\/div>/i);
    for (const row of rows) {
        if (!norm(row).includes(nn))
            continue;
        const m = row.match(/₹\s?([\d,]+(?:\.\d+)?)/);
        if (m)
            return num(m[1]);
        const m2 = row.match(/(?:GMP|premium)[^\d₹]*?([\d,]+(?:\.\d+)?)/i);
        if (m2)
            return num(m2[1]);
    }
    return null;
}
async function htmlGmpSource(name, url, symbol, companyName) {
    let htmlText = null;
    try {
        htmlText = await fetchHttp(url, aggConfig(name), { cache: true });
    }
    catch {
        return null;
    }
    if (!htmlText)
        return null;
    const gmp = extractGmpFromHtml(htmlText, companyName);
    if (gmp === null)
        return null;
    return { gmp, gmpPercent: null, gmpAsOf: null, source: name };
}
const ipoWatchSource = {
    name: "IPO Watch",
    fetch: (symbol, companyName) => htmlGmpSource("IPO Watch", "https://www.ipowatch.in/ipo-gmp/", symbol, companyName),
};
const chittorgarhSource = {
    name: "Chittorgarh",
    fetch: (symbol, companyName) => htmlGmpSource("Chittorgarh", "https://www.chittorgarh.com/ipo/", symbol, companyName),
};
// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
const SOURCES = [investorGainSource, ipoWatchSource, chittorgarhSource];
export async function fetchEnrichment(symbol, companyName) {
    for (const s of SOURCES) {
        try {
            const e = await s.fetch(symbol, companyName);
            if (e && (e.gmp !== null || e.subscription || e.financials))
                return e;
        }
        catch {
            // try next source
        }
    }
    return null;
}
//# sourceMappingURL=aggregators.js.map