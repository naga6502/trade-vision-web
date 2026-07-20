import { validateSymbol, fetchDailyBars, mean, std, round } from "../quant/util.js";
/** Minimum completed round-trips before win-rate / trade stats are trusted. */
export const MIN_RELIABLE_TRADES = 5;
const TD = 252;
function smaSeries(arr, period) {
    const out = [];
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (i >= period)
            sum -= arr[i - period];
        out.push(i >= period - 1 ? sum / period : NaN);
    }
    return out;
}
function emaSeries(arr, period) {
    const k = 2 / (period + 1);
    const out = [];
    let prev = NaN;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        if (i < period - 1) {
            out.push(NaN);
            sum += arr[i];
        }
        else if (i === period - 1) {
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
function rsiSeries(closes, period = 14) {
    const out = new Array(closes.length).fill(NaN);
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
    out[period] = 100 - 100 / (1 + gain / (loss || 1e-9));
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        const g = Math.max(d, 0);
        const l = Math.max(-d, 0);
        gain = (gain * (period - 1) + g) / period;
        loss = (loss * (period - 1) + l) / period;
        out[i] = 100 - 100 / (1 + gain / (loss || 1e-9));
    }
    return out;
}
function macdSeries(closes, fast = 12, slow = 26, signalP = 9) {
    const ef = emaSeries(closes, fast);
    const es = emaSeries(closes, slow);
    const line = ef.map((v, i) => v - es[i]);
    const start = line.findIndex((v) => !Number.isNaN(v));
    const valid = start >= 0 ? line.slice(start) : [];
    const sig = valid.length ? emaSeries(valid, signalP) : [];
    const signal = new Array(closes.length).fill(NaN);
    for (let i = 0; i < sig.length; i++)
        signal[start + i] = sig[i];
    return { line, signal };
}
// Build a 0/1 position series. Strategies are long-only.
function positionSmaCross(closes) {
    const fast = smaSeries(closes, 50);
    const slow = smaSeries(closes, 200);
    return closes.map((_, i) => (fast[i] > slow[i] ? 1 : 0));
}
function positionRsiMeanReversion(closes) {
    const r = rsiSeries(closes, 14);
    const pos = new Array(closes.length).fill(0);
    let state = 0;
    for (let i = 0; i < closes.length; i++) {
        if (Number.isNaN(r[i])) {
            pos[i] = state;
            continue;
        }
        if (state === 0 && r[i] < 30)
            state = 1;
        else if (state === 1 && r[i] > 70)
            state = 0;
        pos[i] = state;
    }
    return pos;
}
function positionMacdCross(closes) {
    const { line, signal } = macdSeries(closes);
    return closes.map((_, i) => Number.isNaN(line[i]) || Number.isNaN(signal[i]) ? 0 : line[i] > signal[i] ? 1 : 0);
}
function positionHold() {
    return (closes) => closes.map(() => 1);
}
function backtest(closes, position) {
    const equity = [1];
    const dailyRet = [];
    for (let i = 1; i < closes.length; i++) {
        const held = position[i - 1];
        const r = held ? closes[i] / closes[i - 1] - 1 : 0;
        dailyRet.push(r);
        equity.push(equity[equity.length - 1] * (1 + r));
    }
    const n = dailyRet.length;
    const m = mean(dailyRet);
    const sd = std(dailyRet);
    const sharpe = sd > 0 ? (m / sd) * Math.sqrt(TD) : 0;
    const downside = dailyRet.filter((r) => r < 0);
    const dStd = downside.length ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length) : 0;
    const sortino = dStd > 0 ? (m / dStd) * Math.sqrt(TD) : 0;
    let peak = equity[0];
    let maxDd = 0;
    for (const e of equity) {
        peak = Math.max(peak, e);
        maxDd = Math.min(maxDd, e / peak - 1);
    }
    const finalEquity = equity[equity.length - 1];
    const cumulative = finalEquity - 1;
    const annualized = Math.pow(finalEquity, TD / n) - 1;
    // Completed round-trips from position changes.
    const trades = [];
    let entry = -1;
    for (let i = 1; i < position.length; i++) {
        if (position[i - 1] === 0 && position[i] === 1)
            entry = i;
        else if (position[i - 1] === 1 && position[i] === 0 && entry >= 0) {
            trades.push({ ret: closes[i] / closes[entry] - 1 });
            entry = -1;
        }
    }
    if (entry >= 0)
        trades.push({ ret: closes[closes.length - 1] / closes[entry] - 1 });
    const wins = trades.filter((t) => t.ret > 0).length;
    const winRate = trades.length ? wins / trades.length : 0;
    // No *round-trip* trades. This is normal for buy & hold (always long), which
    // has real, reportable performance. It only means "no signal" when the
    // strategy never went long at all (position was flat the whole window).
    const alwaysLong = position.every((p) => p === 1);
    const neverLong = position.every((p) => p === 0);
    if (trades.length === 0 && neverLong) {
        return {
            metrics: {
                cumulativeReturnPct: NaN,
                annualizedReturnPct: NaN,
                sharpe: NaN,
                sortino: NaN,
                maxDrawdownPct: NaN,
                winRate: NaN,
                numTrades: 0,
                finalEquity: NaN,
                reliable: false,
            },
            trades,
        };
    }
    // Trust the stats only when there are enough completed round-trips to make
    // win rate / trade counts meaningful (e.g. a single trade showing "100% win"
    // is not robust). Buy & hold is excepted: it has real, reportable
    // performance despite having no round-trips.
    const reliable = alwaysLong || trades.length >= MIN_RELIABLE_TRADES;
    return {
        metrics: {
            cumulativeReturnPct: round(cumulative * 100, 2),
            annualizedReturnPct: round(annualized * 100, 2),
            sharpe: round(sharpe, 2),
            sortino: round(sortino, 2),
            maxDrawdownPct: round(maxDd * 100, 2),
            winRate: round(winRate, 3),
            numTrades: trades.length,
            finalEquity: round(finalEquity, 4),
            reliable,
        },
        trades,
    };
}
export async function getEquityCurves(args) {
    const ticker = validateSymbol(args.symbol);
    const windowDays = args.windowDays ?? 365;
    // Fetch a longer lookback so slow indicators (SMA 200) are fully warmed up
    // before the trailing `windowDays` window we actually backtest.
    const lookbackDays = Math.max(windowDays + 400, 750);
    const { bars: raw } = await fetchDailyBars(ticker, lookbackDays);
    if (raw.length < 60)
        throw new Error(`Not enough history for ${ticker}`);
    // Evaluate only the trailing `windowDays` of bars, but keep the earlier bars
    // so SMA(200)/EMA windows are seeded with real prices.
    const keep = Math.min(windowDays, raw.length);
    const bars = raw.slice(raw.length - keep);
    const warmupBars = raw.length - keep;
    const closes = bars.map((b) => b.close);
    const specs = [
        { name: "buy_and_hold", description: "Hold the stock for the entire window.", pos: positionHold()(closes) },
        { name: "sma_50_200", description: "Long when SMA(50) > SMA(200), else flat.", pos: positionSmaCross(closes) },
        {
            name: "rsi_mean_reversion",
            description: "Long when RSI(14) < 30, exit when RSI(14) > 70.",
            pos: positionRsiMeanReversion(closes),
        },
        { name: "macd_cross", description: "Long when MACD line > signal line, else flat.", pos: positionMacdCross(closes) },
    ];
    const strategies = specs.map((s) => {
        const { metrics } = backtest(closes, s.pos);
        return { strategy: s.name, description: s.description, ...metrics };
    });
    return {
        symbol: ticker,
        bars: bars.length,
        windowDays,
        warmupBars,
        strategies,
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=equityCurves.js.map