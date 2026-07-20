import YahooFinance from "yahoo-finance2";
// Native technical-analysis engine. Replaces the third-party TradingView
// embed widget with indicators computed from Yahoo Finance historical data,
// so the Technical page always renders without any external widget host or
// API key.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
const SYMBOL_RE = /^[A-Z0-9&._-]{1,25}$/;
// Cache computed results for 60s so the Technical / Volatility / Pattern
// panels on one page share a single Yahoo fetch instead of three.
const techCache = new Map();
const TECH_TTL_MS = 60_000;
// ---- indicator math -------------------------------------------------------
export function sma(arr, period) {
    if (arr.length < period)
        return NaN;
    let s = 0;
    for (let i = arr.length - period; i < arr.length; i++)
        s += arr[i];
    return s / period;
}
function emaSeries(arr, period) {
    const k = 2 / (period + 1);
    const out = [];
    let sum = 0;
    let prev = NaN;
    for (let i = 0; i < arr.length; i++) {
        if (i < period - 1) {
            out.push(NaN);
            sum += arr[i];
        }
        else if (i === period - 1) {
            sum += arr[i];
            prev = sum / period;
            out.push(prev);
        }
        else {
            prev = arr[i] * k + prev * (1 - k);
            out.push(prev);
        }
    }
    return out;
}
export function ema(arr, period) {
    const s = emaSeries(arr, period);
    return s[s.length - 1];
}
export function rsi(closes, period = 14) {
    if (closes.length <= period)
        return NaN;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d >= 0)
            gain += d;
        else
            loss -= d;
    }
    gain /= period;
    loss /= period;
    let r = 100 - 100 / (1 + gain / (loss || 1e-9));
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        const g = Math.max(d, 0);
        const l = Math.max(-d, 0);
        gain = (gain * (period - 1) + g) / period;
        loss = (loss * (period - 1) + l) / period;
        r = 100 - 100 / (1 + gain / (loss || 1e-9));
    }
    return r;
}
function stochastic(highs, lows, closes, period = 14, signalP = 3) {
    const n = closes.length;
    if (n < period)
        return { k: NaN, d: NaN };
    const pctK = (j) => {
        const c = closes[j];
        let hh = -Infinity;
        let ll = Infinity;
        for (let i = j - period + 1; i <= j; i++) {
            hh = Math.max(hh, highs[i]);
            ll = Math.min(ll, lows[i]);
        }
        return ll === hh ? 50 : ((c - ll) / (hh - ll)) * 100;
    };
    const k = pctK(n - 1);
    const ks = [];
    for (let j = n - signalP; j < n; j++)
        ks.push(pctK(j));
    const d = ks.reduce((a, b) => a + b, 0) / ks.length;
    return { k, d };
}
export function macd(closes, fast = 12, slow = 26, signalP = 9) {
    const ef = emaSeries(closes, fast);
    const es = emaSeries(closes, slow);
    const line = ef.map((v, i) => v - es[i]);
    const start = line.findIndex((v) => !Number.isNaN(v));
    if (start < 0)
        return { macd: NaN, signal: NaN, hist: NaN };
    const valid = line.slice(start);
    const sig = emaSeries(valid, signalP);
    const last = valid[valid.length - 1];
    const s = sig[sig.length - 1];
    return { macd: last, signal: s, hist: last - s };
}
export function adx(highs, lows, closes, period = 14) {
    const n = closes.length;
    if (n <= period + 1)
        return { adx: NaN, plusDI: NaN, minusDI: NaN };
    const tr = [0];
    const pdm = [0];
    const mdm = [0];
    for (let i = 1; i < n; i++) {
        const hl = highs[i] - lows[i];
        const hc = Math.abs(highs[i] - closes[i - 1]);
        const lc = Math.abs(lows[i] - closes[i - 1]);
        tr.push(Math.max(hl, hc, lc));
        const up = highs[i] - highs[i - 1];
        const down = lows[i - 1] - lows[i];
        pdm.push(up > down && up > 0 ? up : 0);
        mdm.push(down > up && down > 0 ? down : 0);
    }
    const smooth = (a) => {
        const o = [a[0]];
        for (let i = 1; i < a.length; i++)
            o.push(o[i - 1] - o[i - 1] / period + a[i]);
        return o;
    };
    const TR = smooth(tr);
    const PDM = smooth(pdm);
    const MDM = smooth(mdm);
    const plusDI = [0];
    const minusDI = [0];
    for (let i = 1; i < n; i++) {
        plusDI.push(TR[i] ? (PDM[i] / TR[i]) * 100 : 0);
        minusDI.push(TR[i] ? (MDM[i] / TR[i]) * 100 : 0);
    }
    const dx = [];
    for (let i = 1; i < n; i++) {
        const denom = plusDI[i] + minusDI[i] || 1e-9;
        dx.push((Math.abs(plusDI[i] - minusDI[i]) / denom) * 100);
    }
    let adxv = dx[0];
    for (let i = 1; i < dx.length; i++)
        adxv = (adxv * (period - 1) + dx[i]) / period;
    return { adx: adxv, plusDI: plusDI[n - 1], minusDI: minusDI[n - 1] };
}
function williamsR(highs, lows, closes, period = 14) {
    const n = closes.length;
    if (n < period)
        return NaN;
    const c = closes[n - 1];
    let hh = -Infinity;
    let ll = Infinity;
    for (let i = n - period; i < n; i++) {
        hh = Math.max(hh, highs[i]);
        ll = Math.min(ll, lows[i]);
    }
    return ll === hh ? -50 : ((hh - c) / (hh - ll)) * -100;
}
export function atr(highs, lows, closes, period = 14) {
    const n = closes.length;
    if (n < 2)
        return NaN;
    const tr = [highs[0] - lows[0]];
    for (let i = 1; i < n; i++) {
        tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }
    const p = Math.min(period, tr.length);
    let prev = tr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p; i < tr.length; i++)
        prev = (prev * (period - 1) + tr[i]) / period;
    return prev;
}
export function bollingerWidth(closes, period = 20, mult = 2) {
    const n = closes.length;
    if (n < period)
        return NaN;
    const slice = closes.slice(n - period);
    const mid = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    return mid !== 0 ? ((2 * mult * sd) / mid) * 100 : NaN;
}
function histVol(closes, period = 20) {
    const n = closes.length;
    if (n < period + 1)
        return NaN;
    const rets = [];
    for (let i = n - period; i < n; i++)
        rets.push(Math.log(closes[i] / closes[i - 1]));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
}
// Is the Indian equity market open right now (IST, Mon–Fri 09:15–15:30)?
// Used to decide whether the latest intraday bar is still forming.
function istParts() {
    // Convert "now" to an IST calendar instant without relying on toLocaleString
    // (Date.now() is a number, so .toLocaleString would hit Number's signature).
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    return {
        y: ist.getFullYear(),
        m: ist.getMonth() + 1,
        d: ist.getDate(),
        h: ist.getHours(),
        min: ist.getMinutes(),
        day: ist.getDay(),
    };
}
function indiaMarketOpenNow() {
    const { day, h, min } = istParts();
    if (day === 0 || day === 6)
        return false;
    const mins = h * 60 + min;
    return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}
// Broad candlestick pattern detection over the last up to three bars. Pure
// heuristic, no external service. Returns an empty list when fewer than 3 bars
// are available for the multi-bar patterns.
export function detectCandlePatterns(bars, opts = {}) {
    const out = [];
    const n = bars.length;
    if (n < 1)
        return out;
    const forming = !!opts.forming;
    const last = bars[n - 1];
    const eps = (b) => Math.abs(b.close) * 1e-4 + 1e-9;
    const bodyAbs = (b) => Math.abs(b.close - b.open);
    const rng = (b) => (b.high - b.low) || eps(b);
    const bull = (b) => b.close > b.open;
    const bear = (b) => b.close < b.open;
    const bodyFrac = (b) => bodyAbs(b) / rng(b);
    const upFrac = (b) => (b.high - Math.max(b.open, b.close)) / rng(b);
    const dnFrac = (b) => (Math.min(b.open, b.close) - b.low) / rng(b);
    const push = (name, type, note) => out.push({ name, type, note, forming });
    const trend = n >= 2 ? last.close - bars[n - 2].close : 0;
    // ---- single-candle (last bar) ----
    const bf = bodyFrac(last);
    if (bf <= 0.1) {
        push("Doji", "NEUTRAL", "Open ≈ close — indecision, buyers and sellers balanced.");
    }
    else if (bf >= 0.92) {
        push(bull(last) ? "Bullish Marubozu" : "Bearish Marubozu", bull(last) ? "BULLISH" : "BEARISH", "Full-bodied candle with little or no wicks — strong conviction.");
    }
    else if (bf <= 0.4 && dnFrac(last) >= 0.55 && upFrac(last) <= 0.25) {
        push(trend < 0 ? "Hammer" : "Hanging Man", trend < 0 ? "BULLISH" : "BEARISH", "Small body at the top, long lower wick — potential reversal.");
    }
    else if (bf <= 0.4 && upFrac(last) >= 0.55 && dnFrac(last) <= 0.25) {
        push(trend > 0 ? "Shooting Star" : "Inverted Hammer", trend > 0 ? "BEARISH" : "BULLISH", "Small body at the bottom, long upper wick — potential reversal.");
    }
    else if (bf > 0.1 &&
        bf <= 0.45 &&
        upFrac(last) > 0.2 &&
        upFrac(last) <= 0.5 &&
        dnFrac(last) > 0.2 &&
        dnFrac(last) <= 0.5) {
        push("Spinning Top", "NEUTRAL", "Small body with two balanced wicks — indecision.");
    }
    // ---- two-candle ----
    if (n >= 2) {
        const p = bars[n - 2];
        const l = last;
        if (bear(p) && bull(l) && l.open <= p.close + eps(p) && l.close >= p.open - eps(p)) {
            push("Bullish Engulfing", "BULLISH", "Bullish candle fully engulfs the prior bearish candle.");
        }
        else if (bull(p) && bear(l) && l.open >= p.close - eps(p) && l.close <= p.open + eps(p)) {
            push("Bearish Engulfing", "BEARISH", "Bearish candle fully engulfs the prior bullish candle.");
        }
        if (bull(p) && bodyFrac(p) > 0.6 && bull(l) && l.high < p.high && l.low > p.low) {
            push("Bullish Harami", "BULLISH", "Small bullish candle nested inside the prior large body — momentum slowdown.");
        }
        else if (bear(p) && bodyFrac(p) > 0.6 && bear(l) && l.high < p.high && l.low > p.low) {
            push("Bearish Harami", "BEARISH", "Small bearish candle nested inside the prior large body — momentum slowdown.");
        }
        // Tweezers: near-equal highs/lows at a local extreme.
        if (l.high >= p.high - eps(p) && Math.abs(p.high - l.high) <= eps(p) * 2) {
            push("Tweezers Top", "BEARISH", "Matching highs on two candles — resistance / potential reversal down.");
        }
        if (l.low <= p.low + eps(p) && Math.abs(p.low - l.low) <= eps(p) * 2) {
            push("Tweezers Bottom", "BULLISH", "Matching lows on two candles — support / potential reversal up.");
        }
        if (bear(p) && bull(l) && l.open < p.close && l.close > (p.open + p.close) / 2) {
            push("Piercing Line", "BULLISH", "Bullish candle opens below the prior close and closes past its midpoint.");
        }
        if (bull(p) && bear(l) && l.open > p.high && l.close < (p.open + p.close) / 2) {
            push("Dark Cloud Cover", "BEARISH", "Bearish candle opens above the prior high and closes below its midpoint.");
        }
    }
    // ---- three-candle ----
    if (n >= 3) {
        const pp = bars[n - 3];
        const p = bars[n - 2];
        const l = last;
        const mid = (x) => (x.open + x.close) / 2;
        if (bear(pp) && bodyFrac(pp) > 0.5 && bodyFrac(p) < 0.4 && bull(l) && l.close > mid(p)) {
            push("Morning Star", "BULLISH", "Bearish → small-bodied → bullish; early reversal up.");
        }
        if (bull(pp) && bodyFrac(pp) > 0.5 && bodyFrac(p) < 0.4 && bear(l) && l.close < mid(p)) {
            push("Evening Star", "BEARISH", "Bullish → small-bodied → bearish; early reversal down.");
        }
        if (bull(pp) && bull(p) && bull(l) &&
            l.close > p.close && p.close > pp.close && bodyFrac(l) > 0.5) {
            push("Three White Soldiers", "BULLISH", "Three consecutive bullish candles, each closing higher — strong uptrend.");
        }
        if (bear(pp) && bear(p) && bear(l) &&
            l.close < p.close && p.close < pp.close && bodyFrac(l) > 0.5) {
            push("Three Black Crows", "BEARISH", "Three consecutive bearish candles, each closing lower — strong downtrend.");
        }
    }
    return out;
}
// Back-compat shim for the existing `Technical.patterns` field (daily, no notes).
function detectPatterns(bars) {
    return detectCandlePatterns(bars, { forming: false }).map((p) => ({ name: p.name, type: p.type }));
}
// ===========================================================================
// Multi-horizon chart-pattern analysis (intraday / short-term / long-term).
//
// Beyond single/double/triple-bar candlestick patterns, this reads the *price
// geometry* the way a discretionary tape-reader would: it locates swing
// pivots, then scores classic continuation and reversal formations against the
// current trend, volume context, and breakout levels. Each detection carries a
// confidence and a "forming" flag so the UI can show live, still-developing
// structures rather than only confirmed (already-broken) ones.
// ===========================================================================
const patternCache = new Map();
const PATTERN_TTL_MS = 60_000;
export async function fetchBars(ticker, interval, days) {
    const now = Math.floor(Date.now() / 1000);
    const p1 = now - Math.max(days, 1) * 24 * 3600;
    const r = await yahooFinance.chart(ticker, {
        period1: p1,
        period2: now,
        interval: interval,
    });
    return (r?.quotes ?? [])
        .filter((q) => q &&
        typeof q.close === "number" &&
        q.high != null &&
        q.low != null &&
        q.open != null)
        .map((q) => {
        const d = q.date instanceof Date ? q.date.toISOString() : String(q.date || "");
        return {
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume ?? 0,
            date: d.slice(0, 10),
        };
    });
}
// Pivot highs/lows: an index is a pivot high if it is the strict max of the
// `left`/`right` window around it (ties allowed by taking the first/last).
function findPivots(highs, lows, left, right) {
    const hi = [];
    const lo = [];
    for (let i = left; i < highs.length - right; i++) {
        let isHi = true;
        let isLo = true;
        for (let j = i - left; j <= i + right; j++) {
            if (highs[j] > highs[i])
                isHi = false;
            if (lows[j] < lows[i])
                isLo = false;
        }
        if (isHi)
            hi.push(i);
        if (isLo)
            lo.push(i);
    }
    return { hi, lo };
}
// Linear-regression slope of y over x, used to test whether a sequence of
// pivots is rising, falling, or flat.
function slope(xs, ys) {
    const n = xs.length;
    if (n < 2)
        return 0;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let k = 0; k < n; k++) {
        num += (xs[k] - mx) * (ys[k] - my);
        den += (xs[k] - mx) ** 2;
    }
    return den ? num / den : 0;
}
function istTodayDateStr() {
    const { y, m, d } = istParts();
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
// Is the final daily bar the still-in-progress session?
function lastBarIsToday(bars) {
    if (!bars.length)
        return false;
    return bars[bars.length - 1].date === istTodayDateStr();
}
function rupee(n) {
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`;
}
function dedupPatterns(patterns) {
    const seen = new Set();
    const out = [];
    for (const p of patterns) {
        if (seen.has(p.name))
            continue;
        seen.add(p.name);
        out.push(p);
    }
    return out;
}
// Core geometric read of one horizon's bars. Returns the detected formations
// (classic + the most recent candlestick signals), each with a trader's note.
function detectChartPatterns(p) {
    const { highs, lows, closes, hi, lo, horizon, last, liveLast, atr } = p;
    const out = [];
    const n = closes.length;
    const H = (i) => highs[i];
    const L = (i) => lows[i];
    const tol = Math.max(0.012, (atr / Math.max(last, 1e-9))) * (horizon === "intraday" ? 2 : 1.4);
    const ma20 = sma(closes, Math.min(20, n));
    const trendUp = Number.isNaN(ma20) ? closes[n - 1] >= closes[0] : last > ma20;
    const push = (name, type, note, confidence, forming = liveLast) => out.push({ name, type, note, forming, confidence });
    const flatThresh = horizon === "intraday" ? 0.0016 : 0.0008;
    // ---- Double Top / Bottom ------------------------------------------------
    if (hi.length >= 2) {
        const a = hi[hi.length - 2];
        const b = hi[hi.length - 1];
        const pa = H(a);
        const pb = H(b);
        if (Math.abs(pa - pb) <= tol * 1.5 * pa && b - a > 2) {
            const midLo = lo.filter((i) => i > a && i < b);
            if (midLo.length) {
                const neck = L(midLo[midLo.length - 1]);
                if (last < neck) {
                    push("Double Top", "BEARISH", `Twin peaks near ${rupee(pa)} with a neckline at ${rupee(neck)}. The neckline break confirms distribution; measured move targets ${rupee(neck - (pa - neck))}.`, "HIGH", false);
                }
                else if (last >= pa * 0.985) {
                    push("Double Top (forming)", "BEARISH", `Two failed attempts to clear ${rupee(pa)}; supply is stepping in at the same shelf. Bearish while below it — a neckline break under ${rupee(neck)} triggers the move.`, "MEDIUM", true);
                }
            }
        }
    }
    if (lo.length >= 2) {
        const a = lo[lo.length - 2];
        const b = lo[lo.length - 1];
        const pa = L(a);
        const pb = L(b);
        if (Math.abs(pa - pb) <= tol * 1.5 * pa && b - a > 2) {
            const midHi = hi.filter((i) => i > a && i < b);
            if (midHi.length) {
                const neck = H(midHi[midHi.length - 1]);
                if (last > neck) {
                    push("Double Bottom", "BULLISH", `Twin lows near ${rupee(pa)} with a neckline at ${rupee(neck)}. The breakout above confirms accumulation; measured target ${rupee(neck + (neck - pa))}.`, "HIGH", false);
                }
                else if (last <= pa * 1.015) {
                    push("Double Bottom (forming)", "BULLISH", `Two defensive lows holding at ${rupee(pa)} — buyers are defending the floor. A close above ${rupee(neck)} confirms the base and opens the retest-of-range move.`, "MEDIUM", true);
                }
            }
        }
    }
    // ---- Head & Shoulders / Inverse H&S -----------------------------------
    const Hn = hi.slice(-6);
    const Ln = lo.slice(-6);
    if (Hn.length >= 3) {
        const [i1, i2, i3] = Hn.slice(-3);
        const hs = H(i1);
        const hd = H(i2);
        const rs = H(i3);
        if (hd > hs * 1.01 && hd > rs * 1.01 && Math.abs(hs - rs) <= tol * 2 * hs) {
            const nl = Ln.filter((i) => i > i1 && i < i3);
            if (nl.length >= 2) {
                const x1 = nl[0];
                const x2 = nl[nl.length - 1];
                const y1 = L(x1);
                const y2 = L(x2);
                const neckAt = (x) => (x1 === x2 ? y1 : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1));
                const neckNow = neckAt(i3);
                if (last < neckNow) {
                    push("Head & Shoulders", "BEARISH", `Left shoulder ${rupee(hs)}, head ${rupee(hd)}, right shoulder ${rupee(rs)}; neckline ${rupee(neckNow)} broken. Distribution confirmed — target ≈ ${rupee(neckNow - (hd - neckNow))}.`, "HIGH", false);
                }
                else {
                    push("Head & Shoulders (forming)", "BEARISH", `Right shoulder building under the head high of ${rupee(hd)}. Bearish while price holds below the neckline at ${rupee(neckNow)}; a breakdown there triggers the pattern.`, "MEDIUM", true);
                }
            }
        }
    }
    if (Ln.length >= 3) {
        const [i1, i2, i3] = Ln.slice(-3);
        const ls = L(i1);
        const hd = L(i2);
        const rs = L(i3);
        if (hd < ls * 0.99 && hd < rs * 0.99 && Math.abs(ls - rs) <= tol * 2 * ls) {
            const nh = Hn.filter((i) => i > i1 && i < i3);
            if (nh.length >= 2) {
                const x1 = nh[0];
                const x2 = nh[nh.length - 1];
                const y1 = H(x1);
                const y2 = H(x2);
                const neckAt = (x) => (x1 === x2 ? y1 : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1));
                const neckNow = neckAt(i3);
                if (last > neckNow) {
                    push("Inverse Head & Shoulders", "BULLISH", `Left ${rupee(ls)}, head ${rupee(hd)}, right ${rupee(rs)}; neckline ${rupee(neckNow)} taken out — bottom reversal confirmed, target ≈ ${rupee(neckNow + (neckNow - hd))}.`, "HIGH", false);
                }
                else {
                    push("Inverse Head & Shoulders (forming)", "BULLISH", `Right shoulder carving above the head low of ${rupee(hd)}. A close over the neckline at ${rupee(neckNow)} confirms the reversal.`, "MEDIUM", true);
                }
            }
        }
    }
    // ---- Triangles & Wedges (last 5 pivots) -------------------------------
    const H5 = Hn.slice(-5);
    const L5 = Ln.slice(-5);
    if (H5.length >= 3 && L5.length >= 3) {
        const avg = (H(H5[H5.length - 1]) + L(L5[L5.length - 1])) / 2 || 1;
        const hsR = slope(H5, H5.map(H)) / avg;
        const lsR = slope(L5, L5.map(L)) / avg;
        const top = H(H5[H5.length - 1]);
        const bot = L(L5[L5.length - 1]);
        if (Math.abs(hsR) < flatThresh && lsR > flatThresh) {
            push("Ascending Triangle", "BULLISH", `Flat resistance near ${rupee(top)} with higher lows — a bullish coil. Breakout above resistance (on volume) is the trigger; failure leaks back into the range.`, "MEDIUM", liveLast);
        }
        else if (hsR < -flatThresh && Math.abs(lsR) < flatThresh) {
            push("Descending Triangle", "BEARISH", `Flat support near ${rupee(bot)} with lower highs — supply building. A breakdown below support is the trigger; a hold there can fake-and-pop.`, "MEDIUM", liveLast);
        }
        else if (hsR < -flatThresh && lsR > flatThresh) {
            push("Symmetrical Triangle", "NEUTRAL", `Converging highs and lows — a coil with no directional bias of its own. Read it as a continuation of the prior ${trendUp ? "uptrend" : "downtrend"}; trade the breakout, not the apex.`, "LOW", liveLast);
        }
        else if (hsR > 0.0006 && lsR > 0.0006 && lsR > hsR) {
            push("Rising Wedge", "BEARISH", `Both highs and lows rising, but lows climb faster — a narrowing up-channel that typically resolves down. Watch for loss of the lower trendline.`, "MEDIUM", liveLast);
        }
        else if (hsR < -0.0006 && lsR < -0.0006 && hsR < lsR) {
            push("Falling Wedge", "BULLISH", `Both highs and lows falling, but narrowing — a falling wedge that typically resolves up. Watch the upper trendline for the breakout.`, "MEDIUM", liveLast);
        }
    }
    // ---- Flags (pole + tight counter-trend channel) ------------------------
    const win = horizon === "intraday" ? 10 : horizon === "short" ? 14 : 20;
    if (closes.length >= win + 4) {
        const pole = closes.slice(-win - 4, -4);
        const flag = closes.slice(-4);
        const poleMove = pole[pole.length - 1] - pole[0];
        const minPole = horizon === "intraday" ? 0.005 : 0.05;
        if (Math.abs(poleMove) / (pole[0] || 1) > minPole) {
            const up = poleMove > 0;
            const flagMove = flag[flag.length - 1] - flag[0];
            const opposite = up ? flagMove < 0 : flagMove > 0;
            const contained = Math.abs(flagMove) < Math.abs(poleMove) * 0.5;
            if (opposite && contained) {
                push(up ? "Bull Flag" : "Bear Flag", up ? "BULLISH" : "BEARISH", `A ~${((Math.abs(poleMove) / (pole[0] || 1)) * 100).toFixed(1)}% ${up ? "rally" : "selloff"} sets the pole; price now coils in a tight ${up ? "counter-downtrend" : "counter-uptrend"} flag. Continuation ${up ? "higher" : "lower"} on a break of ${rupee(flag[flag.length - 1])}.`, "MEDIUM", liveLast);
            }
        }
    }
    // ---- Cup & Handle ------------------------------------------------------
    const cwin = horizon === "intraday" ? 30 : horizon === "short" ? 60 : 120;
    if (closes.length >= cwin) {
        const w = closes.slice(-cwin);
        const left = w[0];
        const right = w[w.length - 1];
        const minIdx = w.indexOf(Math.min(...w));
        if (minIdx >= w.length * 0.25 && minIdx <= w.length * 0.75) {
            const depth = (left - w[minIdx]) / left;
            if (depth >= 0.08 && depth <= 0.6 && Math.abs(left - right) / left <= 0.05) {
                const handle = w.slice(Math.floor(w.length * 0.8));
                const handleMax = Math.max(...handle);
                const handlePull = (handleMax - handle[handle.length - 1]) / left;
                if (handlePull < depth * 0.5) {
                    push("Cup & Handle", "BULLISH", `A ${depth > 0.2 ? "deep" : "shallow"} rounding base over ${cwin} bars with rims near ${rupee(left)} and a shallow handle — textbook accumulation. Breakout above ${rupee(handleMax)} targets ${rupee(right + depth * left)}.`, "MEDIUM", liveLast);
                }
            }
        }
    }
    // ---- Rectangle / Range -------------------------------------------------
    if (H5.length >= 3 && L5.length >= 3) {
        const avg = (H(H5[H5.length - 1]) + L(L5[L5.length - 1])) / 2 || 1;
        const topR = Math.abs(slope(H5, H5.map(H))) / avg;
        const botR = Math.abs(slope(L5, L5.map(L))) / avg;
        const rangeH = Math.max(...H5.map(H));
        const rangeL = Math.min(...L5.map(L));
        if (topR < flatThresh && botR < flatThresh && (rangeH - rangeL) / avg < 0.15) {
            push("Rectangle (Range)", "NEUTRAL", `Price boxed between ${rupee(rangeL)} support and ${rupee(rangeH)} resistance. No trend edge until one gives — trade the range or wait for the breakout and follow it.`, "LOW", liveLast);
        }
    }
    return out;
}
function analyzeHorizon(bars, horizon, marketOpen) {
    if (!bars || bars.length === 0)
        return [];
    if (horizon === "intraday" && bars.length < 6) {
        return [
            {
                name: "No intraday data",
                type: "NEUTRAL",
                note: "Intraday 15-minute bars are only published while the Indian market is open (09:15–15:30 IST). Check back during the session.",
                forming: false,
                confidence: "LOW",
            },
        ];
    }
    if (horizon !== "intraday" && bars.length < 30)
        return [];
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const closes = bars.map((b) => b.close);
    const vols = bars.map((b) => b.volume);
    const last = closes[closes.length - 1];
    const left = horizon === "intraday" ? 1 : horizon === "short" ? 2 : 3;
    const { hi, lo } = findPivots(highs, lows, left, left);
    const liveLast = marketOpen && (horizon === "intraday" ? true : lastBarIsToday(bars));
    const chart = detectChartPatterns({
        highs,
        lows,
        closes,
        vols,
        hi,
        lo,
        horizon,
        last,
        liveLast,
        atr: atr(highs, lows, closes),
    });
    // Candlestick read on the last three bars (only meaningful on the live bar).
    const candle = detectCandlePatterns(bars.slice(-3), { forming: liveLast }).map((c) => ({ ...c, confidence: "MEDIUM" }));
    return dedupPatterns([...chart, ...candle]).slice(0, 8);
}
export async function getPatternAnalysis(args) {
    const raw = (args.symbol ?? "").trim();
    if (!raw)
        throw new Error("symbol is required");
    const upper = raw.toUpperCase();
    const ticker = /\.[A-Z]{1,3}$/.test(upper) ? upper : `${upper}.NS`;
    if (!SYMBOL_RE.test(ticker.replace(".NS", "").replace(".BO", ""))) {
        throw new Error(`invalid symbol: ${JSON.stringify(raw)}`);
    }
    const cached = patternCache.get(ticker);
    if (cached && Date.now() - cached.at < PATTERN_TTL_MS)
        return cached.data;
    const [intraday, short, long] = await Promise.all([
        fetchBars(ticker, "15m", 1).catch(() => []),
        fetchBars(ticker, "1d", 90).catch(() => []),
        fetchBars(ticker, "1d", 365).catch(() => []),
    ]);
    const open = indiaMarketOpenNow();
    const rows = [
        {
            horizon: "intraday",
            label: "Intraday · 15m",
            interval: "15m",
            bars: intraday.length,
            patterns: analyzeHorizon(intraday, "intraday", open),
        },
        {
            horizon: "short",
            label: "Short-term · 3M",
            interval: "1d",
            bars: short.length,
            patterns: analyzeHorizon(short, "short", open),
        },
        {
            horizon: "long",
            label: "Long-term · 1Y",
            interval: "1d",
            bars: long.length,
            patterns: analyzeHorizon(long, "long", open),
        },
    ];
    // Only cache when we actually got daily data — never cache an empty
    // (rate-limited / network-failed) result, or it would mask live data
    // for the full TTL.
    if (short.length > 0 || long.length > 0) {
        patternCache.set(ticker, { at: Date.now(), data: rows });
    }
    return rows;
}
// ---- signal helpers -------------------------------------------------------
function band(val, buyBelow, sellAbove) {
    if (Number.isNaN(val))
        return "NEUTRAL";
    if (val <= buyBelow)
        return "BUY";
    if (val >= sellAbove)
        return "SELL";
    return "NEUTRAL";
}
const scoreOf = (s) => (s === "BUY" ? 1 : s === "SELL" ? -1 : 0);
function summaryLabel(score) {
    if (score >= 0.5)
        return "STRONG BUY";
    if (score >= 0.15)
        return "BUY";
    if (score <= -0.5)
        return "STRONG SELL";
    if (score <= -0.15)
        return "SELL";
    return "NEUTRAL";
}
const f2 = (n) => (Number.isNaN(n) ? "—" : n.toFixed(2));
const fP = (n) => (Number.isNaN(n) ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
// How far back (in bars) to search for the bar where the current verdict first
// triggered. Bounds the backward walk so the scan stays fast even on long
// histories.
const MAX_TRIGGER_LOOKBACK = 180;
// Recomputes the full oscillator + moving-average verdict for a trailing window
// of price data ending at `price` (the close of the last bar in the slice).
// Used for the live verdict and to walk backwards and locate the bar where the
// current BUY/SELL verdict first triggered.
function scoreSignal(closes, highs, lows, price) {
    if (closes.length < 30) {
        return {
            oscillators: [],
            movingAverages: [],
            buy: 0,
            sell: 0,
            neutral: 0,
            score: 0,
            label: "NEUTRAL",
        };
    }
    const rsiV = rsi(closes);
    const stoch = stochastic(highs, lows, closes);
    const macdV = macd(closes);
    const adxV = adx(highs, lows, closes);
    const wrV = williamsR(highs, lows, closes);
    const macdSignal = Number.isNaN(macdV.macd)
        ? "NEUTRAL"
        : macdV.macd > macdV.signal
            ? "BUY"
            : macdV.macd < macdV.signal
                ? "SELL"
                : "NEUTRAL";
    const adxSignal = Number.isNaN(adxV.adx) || adxV.adx < 20
        ? "NEUTRAL"
        : adxV.plusDI > adxV.minusDI
            ? "BUY"
            : "SELL";
    const oscillators = [
        { name: "RSI (14)", value: f2(rsiV), signal: band(rsiV, 30, 70) },
        { name: "Stochastic %K (14)", value: f2(stoch.k), signal: band(stoch.k, 20, 80) },
        {
            name: "MACD (12,26,9)",
            value: `${f2(macdV.macd)} / ${f2(macdV.signal)}`,
            signal: macdSignal,
        },
        {
            name: "ADX (14)",
            value: `${f2(adxV.adx)} (${f2(adxV.plusDI)}/${f2(adxV.minusDI)})`,
            signal: adxSignal,
        },
        { name: "Williams %R (14)", value: f2(wrV), signal: band(wrV, -80, -20) },
    ];
    const maPeriods = [10, 20, 50, 100, 200];
    const movingAverages = [];
    for (const p of maPeriods) {
        const smaV = sma(closes, p);
        movingAverages.push({
            name: `SMA ${p}`,
            value: fP(smaV),
            signal: Number.isNaN(smaV) ? "NEUTRAL" : price > smaV ? "BUY" : price < smaV ? "SELL" : "NEUTRAL",
        });
        const emaV = ema(closes, p);
        movingAverages.push({
            name: `EMA ${p}`,
            value: fP(emaV),
            signal: Number.isNaN(emaV) ? "NEUTRAL" : price > emaV ? "BUY" : price < emaV ? "SELL" : "NEUTRAL",
        });
    }
    const all = [...oscillators, ...movingAverages];
    const total = all.length;
    const buy = all.filter((s) => s.signal === "BUY").length;
    const sell = all.filter((s) => s.signal === "SELL").length;
    const neutral = total - buy - sell;
    const score = all.reduce((a, s) => a + scoreOf(s.signal), 0) / total;
    return {
        oscillators,
        movingAverages,
        buy,
        sell,
        neutral,
        score,
        label: summaryLabel(score),
    };
}
function roundNumStep(p) {
    if (p < 50)
        return 1;
    if (p < 100)
        return 2;
    if (p < 500)
        return 5;
    if (p < 1000)
        return 10;
    if (p < 5000)
        return 25;
    return 100;
}
export function computeConfluence(closes, highs, lows, vols, price, atr, bias) {
    const empty = {
        bias,
        buyZone: null,
        sellZone: null,
        longStop: null,
        longTarget: null,
        longRRR: null,
        shortStop: null,
        shortTarget: null,
        shortRRR: null,
        levels: [],
    };
    if (closes.length < 30 || !Number.isFinite(price) || !(atr > 0))
        return empty;
    const n = closes.length;
    const wn = Math.min(n, 120);
    const c0 = n - wn;
    const cCloses = closes.slice(c0);
    const cHighs = highs.slice(c0);
    const cLows = lows.slice(c0);
    const cVols = vols.slice(c0);
    const cands = [];
    // 1. Swing pivots (left=right=3) over the window.
    const { hi: pHi, lo: pLo } = findPivots(cHighs, cLows, 3, 3);
    for (const i of pLo)
        cands.push({ price: cLows[i], tool: "Pivot" });
    for (const i of pHi)
        cands.push({ price: cHighs[i], tool: "Pivot" });
    // 2. Round numbers nearest to the current price.
    const step = roundNumStep(price);
    cands.push({ price: Math.floor(price / step) * step, tool: "Round" });
    cands.push({ price: Math.ceil(price / step) * step, tool: "Round" });
    // 3. Fibonacci retracements + extensions of the window's range.
    const hi = Math.max(...cHighs);
    const lo = Math.min(...cLows);
    const rng = hi - lo || price * 0.01;
    for (const r of [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]) {
        cands.push({ price: hi - rng * r, tool: "Fib" });
    }
    for (const e of [0.272, 0.618, 1.0, 1.618]) {
        cands.push({ price: hi + rng * e, tool: "Fib" });
    }
    // 4. Moving averages (SMA + EMA) as dynamic S/R.
    for (const p of [20, 50, 100, 200]) {
        cands.push({ price: sma(cCloses, p), tool: "MA" });
        cands.push({ price: ema(cCloses, p), tool: "MA" });
    }
    // 5. Cumulative VWAP over the window (daily-bar proxy).
    let cumPV = 0;
    let cumV = 0;
    for (let i = 0; i < wn; i++) {
        const tp = (cHighs[i] + cLows[i] + cCloses[i]) / 3;
        cumPV += tp * (cVols[i] || 0);
        cumV += cVols[i] || 0;
    }
    if (cumV > 0)
        cands.push({ price: cumPV / cumV, tool: "VWAP" });
    // 6. Volume-profile POC (price bin carrying the most volume).
    const bins = 20;
    const bMin = Math.min(...cCloses);
    const bMax = Math.max(...cCloses);
    const bW = bMax - bMin || price * 0.01;
    const bVol = new Array(bins).fill(0);
    for (let i = 0; i < wn; i++) {
        let b = Math.floor((cCloses[i] - bMin) / bW);
        if (b < 0)
            b = 0;
        if (b >= bins)
            b = bins - 1;
        bVol[b] += cVols[i] || 0;
    }
    let pocB = 0;
    for (let b = 1; b < bins; b++)
        if (bVol[b] > bVol[pocB])
            pocB = b;
    cands.push({ price: bMin + (pocB + 0.5) * bW, tool: "VolProfile" });
    // ---- cluster the candidates that land near each other ----------------
    const tol = Math.max(price * 0.004, atr * 0.5);
    const sorted = cands
        .filter((c) => Number.isFinite(c.price))
        .sort((a, b) => a.price - b.price);
    const raw = [];
    for (const c of sorted) {
        const last = raw[raw.length - 1];
        if (last && c.price <= last.high + tol) {
            last.high = Math.max(last.high, c.price);
            last.low = Math.min(last.low, c.price);
            last.price = (last.price * last.count + c.price) / (last.count + 1);
            last.count++;
            if (!last.sources.includes(c.tool))
                last.sources.push(c.tool);
        }
        else {
            raw.push({ price: c.price, low: c.price, high: c.price, sources: [c.tool], count: 1 });
        }
    }
    const levels = raw.map((r) => ({
        price: r.price,
        low: r.low,
        high: r.high,
        strength: r.sources.length,
        sources: r.sources,
    }));
    // ---- pick the strongest zones below / above the current price --------
    const below = levels
        .filter((l) => l.high < price)
        .sort((a, b) => b.strength - a.strength || b.high - a.high);
    const above = levels
        .filter((l) => l.low > price)
        .sort((a, b) => b.strength - a.strength || a.low - b.low);
    const buyZone = below[0] ?? null;
    const sellZone = above[0] ?? null;
    // ---- derive stops / targets from ATR and the opposite zone -----------
    let longStop = null;
    let longTarget = null;
    let longRRR = null;
    if (buyZone) {
        longStop = buyZone.low - atr;
        longTarget = sellZone ? sellZone.price : price + 2 * atr;
        const risk = price - longStop;
        const reward = longTarget - price;
        longRRR = risk > 0 ? reward / risk : null;
    }
    let shortStop = null;
    let shortTarget = null;
    let shortRRR = null;
    if (sellZone) {
        shortStop = sellZone.high + atr;
        shortTarget = buyZone ? buyZone.price : price - 2 * atr;
        const risk = shortStop - price;
        const reward = price - shortTarget;
        shortRRR = risk > 0 ? reward / risk : null;
    }
    const ranked = levels
        .slice()
        .sort((a, b) => b.strength - a.strength ||
        Math.abs(a.price - price) - Math.abs(b.price - price));
    return {
        bias,
        buyZone,
        sellZone,
        longStop,
        longTarget,
        longRRR,
        shortStop,
        shortTarget,
        shortRRR,
        levels: ranked.slice(0, 10),
    };
}
// ---- tool -----------------------------------------------------------------
export async function getTechnicalAnalysis(args) {
    const raw = (args.symbol ?? "").trim();
    if (!raw)
        throw new Error("symbol is required");
    const upper = raw.toUpperCase();
    const ticker = /\.[A-Z]{1,3}$/.test(upper) ? upper : `${upper}.NS`;
    if (!SYMBOL_RE.test(ticker.replace(".NS", "").replace(".BO", ""))) {
        throw new Error(`invalid symbol: ${JSON.stringify(raw)}`);
    }
    const cached = techCache.get(ticker);
    if (cached && Date.now() - cached.at < TECH_TTL_MS)
        return cached.data;
    const now = Math.floor(Date.now() / 1000);
    const p1 = now - 400 * 24 * 3600;
    const r = await yahooFinance.chart(ticker, {
        period1: p1,
        period2: now,
        interval: "1d",
    });
    const bars = (r?.quotes ?? []).filter((q) => q && typeof q.close === "number" && q.high != null && q.low != null);
    if (bars.length < 30) {
        throw new Error(`Not enough historical data for ${ticker}`);
    }
    const closes = bars.map((b) => b.close);
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const vols = bars.map((b) => (b.volume ?? 0));
    const price = closes[closes.length - 1];
    // Oscillators + moving averages + verdict for the full series.
    const sig = scoreSignal(closes, highs, lows, price);
    // Walk backwards from the latest bar to find the bar where the current
    // verdict first triggered (the last bar still carrying a *different* verdict
    // means the trigger is the bar right after it).
    let triggerIndex = closes.length - 1;
    const minIdx = Math.max(29, closes.length - 1 - MAX_TRIGGER_LOOKBACK);
    for (let i = closes.length - 2; i >= minIdx; i--) {
        const s = scoreSignal(closes.slice(0, i + 1), highs.slice(0, i + 1), lows.slice(0, i + 1), closes[i]);
        if (s.label !== sig.label) {
            triggerIndex = i + 1;
            break;
        }
    }
    const triggerPrice = closes[triggerIndex];
    const triggerDateRaw = bars[triggerIndex]?.date;
    const triggerDate = triggerDateRaw != null
        ? triggerDateRaw instanceof Date
            ? triggerDateRaw.toISOString().slice(0, 10)
            : String(triggerDateRaw).slice(0, 10)
        : undefined;
    const volatility = {
        atr: atr(highs, lows, closes),
        bbWidth: bollingerWidth(closes),
        histVol: histVol(closes),
    };
    const patterns = detectPatterns(bars);
    const confluence = computeConfluence(closes, highs, lows, vols, price, volatility.atr, sig.label.includes("BUY") ? "BUY" : sig.label.includes("SELL") ? "SELL" : "NEUTRAL");
    const data = {
        symbol: ticker,
        price,
        triggerPrice,
        triggerDate,
        confluence,
        summary: { label: sig.label, score: sig.score, buy: sig.buy, neutral: sig.neutral, sell: sig.sell },
        oscillators: sig.oscillators,
        movingAverages: sig.movingAverages,
        volatility,
        patterns,
        generatedAt: new Date().toISOString(),
    };
    techCache.set(ticker, { at: Date.now(), data });
    return data;
}
//# sourceMappingURL=technical.js.map