import YahooFinance from "yahoo-finance2";
// Shared quantitative helpers for the analytics tools (AI prediction, IV radar,
// option pressure, Monte Carlo, backtest, risk scan). Everything here is
// computed natively from Yahoo Finance history and NSE option-chain data — no
// paid API key, no external widget host.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
const SYMBOL_RE = /^[A-Z0-9&._-]{1,25}$/;
// Normalise a user symbol to a Yahoo ticker. Accepts an explicit .NS/.BO suffix;
// otherwise defaults to NSE (.NS). BSE scrip codes (digits) stay as `.BO`.
export function normalizeSymbol(raw) {
    const upper = (raw ?? "").trim().toUpperCase();
    if (/\.[A-Z]{1,3}$/.test(upper))
        return upper;
    if (/^[0-9]{4,6}$/.test(upper))
        return `${upper}.BO`;
    return `${upper}.NS`;
}
export function validateSymbol(raw) {
    const ticker = normalizeSymbol(raw);
    const base = ticker.replace(/\.(NS|BO)$/, "");
    if (!SYMBOL_RE.test(base))
        throw new Error(`invalid symbol: ${JSON.stringify(raw)}`);
    return ticker;
}
// Raw daily OHLCV for a trailing window. Reused by every analytics tool so we
// issue a single Yahoo chart fetch per ticker (callers can cache on top).
export async function fetchDailyBars(ticker, days) {
    const now = Math.floor(Date.now() / 1000);
    const p1 = now - Math.max(days, 2) * 24 * 3600;
    const r = await yahooFinance.chart(ticker, {
        period1: p1,
        period2: now,
        interval: "1d",
    });
    const bars = (r?.quotes ?? [])
        .filter((q) => q &&
        typeof q.close === "number" &&
        q.high != null &&
        q.low != null &&
        q.open != null)
        .map((q) => {
        const d = q.date instanceof Date ? q.date.toISOString() : String(q.date || "");
        return {
            date: d.slice(0, 10),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume ?? 0,
        };
    });
    return { ticker, bars };
}
// ---- statistics -------------------------------------------------------------
export function logReturns(closes) {
    const out = [];
    for (let i = 1; i < closes.length; i++) {
        if (closes[i - 1] > 0 && closes[i] > 0)
            out.push(Math.log(closes[i] / closes[i - 1]));
    }
    return out;
}
export function mean(arr) {
    if (!arr.length)
        return NaN;
    let s = 0;
    for (const v of arr)
        s += v;
    return s / arr.length;
}
// Sample standard deviation (n-1).
export function std(arr, sample = true) {
    if (arr.length < 2)
        return NaN;
    const m = mean(arr);
    let s = 0;
    for (const v of arr)
        s += (v - m) ** 2;
    return Math.sqrt(s / (arr.length - (sample ? 1 : 0)));
}
// Annualised realised volatility from daily closes (default 252 trading days).
export function annualizedVol(closes, periods = 252) {
    const rets = logReturns(closes);
    if (rets.length < 2)
        return NaN;
    return std(rets) * Math.sqrt(periods);
}
// Percentile of value `p` (0..100) within `arr`. Sorts a copy; NaN values are
// ignored. Returns NaN when there is nothing to compute.
export function percentile(arr, p) {
    const clean = arr.filter((v) => Number.isFinite(v));
    if (!clean.length)
        return NaN;
    clean.sort((a, b) => a - b);
    const idx = (Math.min(100, Math.max(0, p)) / 100) * (clean.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi)
        return clean[lo];
    return clean[lo] + (clean[hi] - clean[lo]) * (idx - lo);
}
// Standard-normal sample via Box-Muller. Math.random is fine at MCP runtime.
export function randn() {
    let u = 0;
    let v = 0;
    while (u === 0)
        u = Math.random();
    while (v === 0)
        v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}
export function round(x, dp = 2) {
    if (!Number.isFinite(x))
        return x;
    const f = 10 ** dp;
    return Math.round(x * f) / f;
}
//# sourceMappingURL=util.js.map