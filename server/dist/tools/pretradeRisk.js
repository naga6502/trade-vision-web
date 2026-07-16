import { validateSymbol, fetchDailyBars, annualizedVol, round } from "../quant/util.js";
import { atr } from "./technical.js";
import { getStockQuote } from "./quote.js";
import { getOptionPressure } from "./optionPressure.js";
export async function getPretradeRiskScan(args) {
    const ticker = validateSymbol(args.symbol);
    const riskRupees = Math.max(1, args.riskRupees ?? 25000);
    const stopMultiple = Math.max(0.5, args.stopMultiple ?? 2);
    const [quote, hist] = await Promise.all([
        getStockQuote({ symbol: ticker }).catch(() => null),
        fetchDailyBars(ticker, 60).catch(() => ({ ticker, bars: [] })),
    ]);
    const currentPrice = quote?.price ?? hist.bars[hist.bars.length - 1]?.close ?? 0;
    if (currentPrice <= 0)
        throw new Error(`No price data for ${ticker}`);
    const entryPrice = args.entryPrice && args.entryPrice > 0 ? args.entryPrice : currentPrice;
    const bars = hist.bars;
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const closes = bars.map((b) => b.close);
    const atrVal = bars.length >= 2 ? atr(highs, lows, closes) : NaN;
    const aPct = Number.isFinite(atrVal) ? atrVal / currentPrice : NaN;
    const av = closes.length >= 20 ? annualizedVol(closes.slice(-20)) : NaN;
    // Gap risk: average overnight gap (open vs prior close) over recent bars.
    let gapRiskPct = NaN;
    if (bars.length >= 10) {
        const gaps = [];
        for (let i = 1; i < bars.length; i++) {
            if (bars[i - 1].close > 0)
                gaps.push(Math.abs(bars[i].open - bars[i - 1].close) / bars[i - 1].close);
        }
        gapRiskPct = gaps.length ? (gaps.reduce((a, b) => a + b, 0) / gaps.length) * 100 : NaN;
    }
    // Liquidity.
    const avgVol = quote?.averageVolume ?? null;
    const avgDailyValue = avgVol != null ? avgVol * currentPrice : null;
    const liquidityScore = avgDailyValue == null
        ? "LOW"
        : avgDailyValue > 5e9
            ? "HIGH"
            : avgDailyValue > 5e8
                ? "MEDIUM"
                : "LOW";
    // Stop loss (entry - stopMultiple * ATR).
    const riskPerShare = Number.isFinite(atrVal) ? atrVal * stopMultiple : currentPrice * 0.02;
    const suggestedStop = Math.max(0.01, entryPrice - riskPerShare);
    // Position sizing from risk budget.
    const maxShares = Math.floor(riskRupees / riskPerShare);
    const maxNotional = maxShares * currentPrice;
    // F&O lot size for rounding.
    let maxLots = null;
    try {
        const pressure = await getOptionPressure({ symbol: ticker }).catch(() => null);
        maxLots = null; // lot size included via chain; not strictly required here.
        if (pressure && pressure.underlying) {
            const lotRes = await import("../options/optionChain.js").then((m) => m.getFnoLots(ticker.replace(/\.(NS|BO)$/, "")));
            maxLots = lotRes;
        }
    }
    catch {
        maxLots = null;
    }
    // Earnings proximity.
    let earningsInDays = null;
    if (quote?.earningsDate) {
        const ms = new Date(quote.earningsDate).getTime();
        if (!isNaN(ms))
            earningsInDays = Math.max(0, Math.round((ms - Date.now()) / 86_400_000));
    }
    // Implied move from option chain (if available).
    let impliedMovePct = null;
    try {
        const pressure = await getOptionPressure({ symbol: ticker }).catch(() => null);
        impliedMovePct = pressure?.expectedMove?.pct ?? null;
    }
    catch {
        impliedMovePct = null;
    }
    // Recommendation logic.
    const flags = [];
    let recommendation = "PROCEED";
    if (avgDailyValue != null && maxNotional > avgDailyValue * 0.1) {
        recommendation = "REDUCE_SIZE";
        flags.push(`Planned notional (₹${(maxNotional / 1e7).toFixed(1)} Cr) exceeds 10% of average daily turnover — may be hard to fill without slippage.`);
    }
    if (Number.isFinite(av) && av > 60) {
        flags.push(`Elevated realised volatility (${(av).toFixed(1)}%) — widen stops or reduce size.`);
        if (recommendation === "PROCEED")
            recommendation = "PROCEED_WITH_STOP";
    }
    if (Number.isFinite(gapRiskPct) && gapRiskPct > 3) {
        flags.push(`Frequent overnight gaps (avg ${(gapRiskPct).toFixed(1)}%) — mind gap risk through earnings/events.`);
    }
    if (earningsInDays != null && earningsInDays <= 7) {
        flags.push(`Earnings in ${earningsInDays} day(s) — binary event risk; consider a smaller position or a hedge.`);
        if (recommendation === "PROCEED" || recommendation === "PROCEED_WITH_STOP")
            recommendation = "PROCEED_WITH_STOP";
    }
    if (impliedMovePct != null) {
        flags.push(`Options imply a ~${impliedMovePct}% move into expiry — size against that band.`);
    }
    if (liquidityScore === "LOW" && recommendation !== "REDUCE_SIZE") {
        recommendation = "REDUCE_SIZE";
        flags.push("Low liquidity — prefer smaller size and limit orders.");
    }
    return {
        symbol: ticker,
        entryPrice: round(entryPrice, 2),
        currentPrice: round(currentPrice, 2),
        liquidity: {
            averageVolume: avgVol,
            averageDailyValue: avgDailyValue,
            liquidityScore,
        },
        volatility: {
            atr: Number.isFinite(atrVal) ? round(atrVal, 2) : NaN,
            atrPct: Number.isFinite(aPct) ? round(aPct * 100, 2) : NaN,
            annualizedVolPct: Number.isFinite(av) ? round(av, 1) : NaN,
            beta: quote?.beta ?? null,
        },
        stopLoss: {
            suggestedPrice: round(suggestedStop, 2),
            riskPerShare: round(riskPerShare, 2),
            stopMultiple,
        },
        positionSizing: {
            riskRupees,
            maxShares,
            maxNotional: round(maxNotional, 2),
            maxLots,
        },
        gapRiskPct: Number.isFinite(gapRiskPct) ? round(gapRiskPct, 2) : NaN,
        earningsInDays,
        impliedMovePct,
        recommendation,
        flags,
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=pretradeRisk.js.map