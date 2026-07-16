import { validateSymbol, clamp, round } from "../quant/util.js";
import { getAiPrediction } from "./aiPrediction.js";
import { getIvRadar } from "./ivRadar.js";
import { getOptionPressure } from "./optionPressure.js";
import { getMonteCarlo } from "./monteCarlo.js";
import { getEquityCurves } from "./equityCurves.js";
function verdictFromScore(s) {
    if (s >= 0.6)
        return "STRONG BUY";
    if (s >= 0.2)
        return "BUY";
    if (s <= -0.6)
        return "STRONG SELL";
    if (s <= -0.2)
        return "SELL";
    return "NEUTRAL";
}
export async function getAnalyzeStock(args) {
    const ticker = validateSymbol(args.symbol);
    const [ai, iv, pressure, mc, eq] = await Promise.all([
        getAiPrediction({ symbol: ticker }).catch(() => null),
        getIvRadar({ symbol: ticker }).catch(() => null),
        getOptionPressure({ symbol: ticker }).catch(() => null),
        getMonteCarlo({ symbol: ticker }).catch(() => null),
        getEquityCurves({ symbol: ticker }).catch(() => null),
    ]);
    let score = 0;
    let wsum = 0;
    const bullish = [];
    const bearish = [];
    // AI directional read (weight 0.35).
    if (ai) {
        const w = 0.35;
        score += (ai.prediction === "UP" ? 1 : ai.prediction === "DOWN" ? -1 : 0) * w;
        wsum += w;
        if (ai.prediction === "UP")
            bullish.push(`AI ensemble: UP (up-prob ${(ai.upProbability * 100).toFixed(0)}%, strength ${ai.signalStrength})`);
        else if (ai.prediction === "DOWN")
            bearish.push(`AI ensemble: DOWN (down-prob ${((1 - ai.upProbability) * 100).toFixed(0)}%, strength ${ai.signalStrength})`);
        else
            bullish.push("AI ensemble: FLAT / no edge");
    }
    // Monte Carlo drift (weight 0.2).
    if (mc) {
        const w = 0.2;
        const p = mc.probAboveSpot;
        score += (p > 0.55 ? 1 : p < 0.45 ? -1 : 0) * w;
        wsum += w;
        if (p > 0.55)
            bullish.push(`Monte Carlo: ${(p * 100).toFixed(0)}% prob above spot, median ₹${mc.medianPrice}`);
        else if (p < 0.45)
            bearish.push(`Monte Carlo: ${(p * 100).toFixed(0)}% prob above spot, median ₹${mc.medianPrice}`);
    }
    // Option-pressure pin (weight 0.2).
    if (pressure && pressure.maxPain != null) {
        const w = 0.2;
        const mp = pressure.maxPain;
        score += (mp >= pressure.underlying ? 0.5 : -0.5) * w;
        wsum += w;
        if (mp >= pressure.underlying)
            bullish.push(`Option max pain ₹${mp} is at/above spot — pinned/ supportive into expiry`);
        else
            bearish.push(`Option max pain ₹${mp} is below spot — gravitational drag into expiry`);
    }
    // IV risk reversal skew (weight 0.1).
    if (iv && iv.riskReversal != null) {
        const w = 0.1;
        score += (iv.riskReversal > 0.03 ? 0.3 : iv.riskReversal < -0.03 ? -0.3 : 0) * w;
        wsum += w;
        if (iv.riskReversal > 0.03)
            bullish.push(`Call skew (risk reversal +${iv.riskReversal}) — upside demand`);
        else if (iv.riskReversal < -0.03)
            bearish.push(`Put skew (risk reversal ${iv.riskReversal}) — downside demand`);
    }
    // Backtest edge (weight 0.15).
    if (eq && eq.strategies.length) {
        const w = 0.15;
        const best = eq.strategies.reduce((a, b) => (b.sharpe > a.sharpe ? b : a));
        score += (best.sharpe > 1 ? 0.3 : best.sharpe < 0 ? -0.3 : 0) * w;
        wsum += w;
        if (best.sharpe > 1)
            bullish.push(`Best backtest (${best.strategy}) Sharpe ${best.sharpe}, CAGR ${best.annualizedReturnPct}%`);
        else if (best.sharpe < 0)
            bearish.push(`Backtests unprofitable (best Sharpe ${best.sharpe})`);
    }
    const finalScore = wsum ? clamp(score / wsum, -1, 1) : 0;
    const signal = verdictFromScore(finalScore);
    // Confidence blends AI confidence + MC decisiveness + data availability.
    const confParts = [];
    if (ai)
        confParts.push(ai.confidence);
    if (mc)
        confParts.push(clamp(Math.abs(mc.probAboveSpot - 0.5) * 2, 0, 1));
    const availability = (Number(!!iv) + Number(!!pressure) + Number(!!eq)) / 3;
    if (confParts.length)
        confParts.push(availability * 0.5);
    const confidenceScore = confParts.length ? round(confParts.reduce((a, b) => a + b, 0) / confParts.length, 3) : 0;
    const summary = `${ticker} reads ${signal} (composite ${finalScore.toFixed(2)}, confidence ${(confidenceScore * 100).toFixed(0)}%). ` +
        `${bullish.length ? "Bullish: " + bullish[0] + "." : ""}` +
        `${bearish.length ? " Bearish: " + bearish[0] + "." : ""}` +
        ` Aggregate of native quant signals — not investment advice.`;
    return {
        symbol: ticker,
        signal,
        confidenceScore,
        score: round(finalScore, 3),
        bullishFactors: bullish,
        bearishFactors: bearish,
        summary,
        components: { aiPrediction: ai, ivRadar: iv, optionPressure: pressure, monteCarlo: mc, equityCurves: eq },
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=analyzeStock.js.map