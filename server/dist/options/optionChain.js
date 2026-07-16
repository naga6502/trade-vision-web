import { getSessionCookies, NSE_USER_AGENT } from "../nse/session.js";
import { cacheGet, cacheSet } from "../cache.js";
const NSE_BASE = "https://www.nseindia.com";
const OC_PAGE = `${NSE_BASE}/market-data/option-chain`;
const TTL_MS = 15_000;
function num(v) {
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function leg(o) {
    if (!o || typeof o !== "object")
        return null;
    const r = o;
    return {
        openInterest: num(r.openInterest),
        changeinOpenInterest: num(r.changeinOpenInterest),
        totalTradedVolume: num(r.totalTradedVolume),
        impliedVolatility: num(r.impliedVolatility),
        lastPrice: num(r.lastPrice),
        change: num(r.change),
    };
}
function headers(cookie, referer) {
    return {
        "User-Agent": NSE_USER_AGENT,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "X-Requested-With": "XMLHttpRequest",
        Referer: referer,
        Cookie: cookie,
        "sec-ch-ua": '"Not A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
    };
}
// NSE's option-chain API is stricter than the equity endpoints: it returns an
// empty body unless the request carries section cookies (primed by visiting
// the option-chain page) and full browser headers. This fetch does both.
async function fetchOptionChain(symbol) {
    const cacheKey = `oc:${symbol}`;
    const cached = cacheGet(cacheKey);
    if (cached !== undefined)
        return cached;
    const cookies = await getSessionCookies();
    await fetch(OC_PAGE, {
        headers: headers(cookies, NSE_BASE),
        signal: AbortSignal.timeout(30000),
    }).catch(() => { });
    const res = await fetch(`${NSE_BASE}/api/option-chain-equities?symbol=${encodeURIComponent(symbol)}`, { headers: headers(cookies, OC_PAGE), signal: AbortSignal.timeout(30000) });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        data = {};
    }
    cacheSet(cacheKey, data, TTL_MS);
    return data;
}
function summarize(strikes) {
    let totalCE = 0;
    let totalPE = 0;
    for (const s of strikes) {
        totalCE += s.ce?.openInterest ?? 0;
        totalPE += s.pe?.openInterest ?? 0;
    }
    const totalOI = totalCE + totalPE;
    const pcr = totalCE > 0 ? totalPE / totalCE : null;
    let minPain = Infinity;
    let maxPain = null;
    for (const k of strikes) {
        const K = k.strikePrice;
        let pain = 0;
        for (const s of strikes) {
            const ceOI = s.ce?.openInterest ?? 0;
            const peOI = s.pe?.openInterest ?? 0;
            pain += ceOI * Math.max(0, K - s.strikePrice);
            pain += peOI * Math.max(0, s.strikePrice - K);
        }
        if (pain < minPain) {
            minPain = pain;
            maxPain = K;
        }
    }
    let maxPainCE = 0;
    let maxPainPE = 0;
    if (maxPain != null) {
        const at = strikes.find((s) => s.strikePrice === maxPain);
        maxPainCE = at?.ce?.openInterest ?? 0;
        maxPainPE = at?.pe?.openInterest ?? 0;
    }
    return {
        underlying: 0,
        totalCE,
        totalPE,
        totalOI,
        pcr,
        maxPain,
        maxPainCE,
        maxPainPE,
        maxPainTotal: maxPainCE + maxPainPE,
    };
}
export async function getOptionChain(symbol, expiry) {
    const raw = await fetchOptionChain(symbol);
    const records = raw?.records ?? {};
    const underlying = Number(records.underlyingValue ?? 0);
    const expiryDates = Array.isArray(records.expiryDates)
        ? records.expiryDates
        : [];
    const data = raw?.filtered?.data ?? records.data ?? [];
    const targetExp = expiry ?? expiryDates[0];
    const strikes = data
        .filter((r) => !targetExp || r.expiryDate === targetExp)
        .map((r) => ({
        strikePrice: Number(r.strikePrice ?? 0),
        expiryDate: String(r.expiryDate ?? ""),
        ce: leg(r.CE),
        pe: leg(r.PE),
    }))
        .filter((s) => s.strikePrice > 0)
        .sort((a, b) => a.strikePrice - b.strikePrice);
    const summary = summarize(strikes);
    summary.underlying = underlying;
    return {
        symbol: symbol.toUpperCase(),
        underlying,
        expiryDates,
        strikes,
        summary,
    };
}
export async function getExpiryDates(symbol) {
    const raw = await fetchOptionChain(symbol);
    const expiryDates = Array.isArray(raw?.records?.expiryDates)
        ? raw.records.expiryDates
        : [];
    return expiryDates;
}
export async function getMaxPain(symbol, expiry) {
    const chain = await getOptionChain(symbol, expiry);
    return chain.summary.maxPain;
}
/** Lot size for a symbol, read from the option-chain record if present. */
export async function getFnoLots(symbol) {
    const raw = await fetchOptionChain(symbol);
    const lots = raw?.records?.lotSize ?? raw?.lotSize;
    return typeof lots === "number" && lots > 0 ? lots : null;
}
//# sourceMappingURL=optionChain.js.map