import { getTechnicalAnalysis } from "./technical.js";
import { getPatternAnalysis } from "./technical.js";
import { getFiiDiiActivity } from "./fiiDiiActivity.js";
import { validateSymbol, annualizedVol, fetchDailyBars, clamp } from "../quant/util.js";
function toScore(v) {
    return v === "BULLISH" ? 1 : v === "BEARISH" ? -1 : 0;
}
export async function getAiPrediction(args) {
    const ticker = validateSymbol(args.symbol);
    const [tech, patterns, fii, hist] = await Promise.all([
        getTechnicalAnalysis({ symbol: ticker }).catch(() => null),
        getPatternAnalysis({ symbol: ticker }).catch(() => []),
        getFiiDiiActivity({ limit: 5 }).catch(() => []),
        fetchDailyBars(ticker, 60).catch(() => ({ ticker, bars: [] })),
    ]);
    const votes = [];
    const bullish = [];
    const bearish = [];
    // 1) Trend / structure from the technical summary score (-1..+1).
    if (tech) {
        const s = tech.summary.score;
        const v = s > 0.15 ? "BULLISH" : s < -0.15 ? "BEARISH" : "NEUTRAL";
        votes.push({
            model: "trend_structure",
            vote: v,
            weight: 0.3,
            detail: `Technical composite ${s.toFixed(2)} (${tech.summary.label})`,
        });
        if (v === "BULLISH")
            bullish.push(`Trend structure bullish (${tech.summary.label})`);
        else if (v === "BEARISH")
            bearish.push(`Trend structure bearish (${tech.summary.label})`);
    }
    // 2) Momentum oscillators (RSI / MACD / Stochastic).
    if (tech) {
        let m = 0;
        let n = 0;
        for (const o of tech.oscillators) {
            const sc = o.signal === "BUY" ? 1 : o.signal === "SELL" ? -1 : 0;
            m += sc;
            n++;
        }
        const norm = n ? m / n : 0;
        const v = norm > 0.2 ? "BULLISH" : norm < -0.2 ? "BEARISH" : "NEUTRAL";
        votes.push({
            model: "momentum_oscillators",
            vote: v,
            weight: 0.2,
            detail: `${m}/${n} oscillators bullish`,
        });
        if (v === "BULLISH")
            bullish.push("Momentum oscillators net bullish");
        else if (v === "BEARISH")
            bearish.push("Momentum oscillators net bearish");
    }
    // 3) Chart-pattern bias across all horizons.
    let pBull = 0;
    let pBear = 0;
    for (const row of patterns) {
        for (const p of row.patterns) {
            if (p.type === "BULLISH")
                pBull++;
            else if (p.type === "BEARISH")
                pBear++;
        }
    }
    if (patterns.length) {
        const v = pBull > pBear ? "BULLISH" : pBear > pBull ? "BEARISH" : "NEUTRAL";
        votes.push({
            model: "chart_patterns",
            vote: v,
            weight: 0.2,
            detail: `${pBull} bullish / ${pBear} bearish patterns`,
        });
        if (pBull > pBear)
            bullish.push(`Chart patterns lean bullish (${pBull} vs ${pBear})`);
        else if (pBear > pBull)
            bearish.push(`Chart patterns lean bearish (${pBear} vs ${pBull})`);
    }
    // 4) Institutional flow (FII net over recent sessions).
    if (fii.length) {
        const net = fii.reduce((a, r) => a + (r.fiiNetValue ?? 0), 0);
        const v = net > 0 ? "BULLISH" : net < 0 ? "BEARISH" : "NEUTRAL";
        votes.push({
            model: "fii_flow",
            vote: v,
            weight: 0.2,
            detail: `FII net ₹${(net / 1e7).toFixed(0)} Cr over ${fii.length} sessions`,
        });
        if (net > 0)
            bullish.push(`FIIs net buyers ₹${(net / 1e7).toFixed(1)} Cr recently`);
        else if (net < 0)
            bearish.push(`FIIs net sellers ₹${(Math.abs(net) / 1e7).toFixed(1)} Cr recently`);
    }
    // 5) Volatility regime — calm tape drifts, choppy tape is risk-off.
    const closes = hist.bars.map((b) => b.close);
    let regime = "RANGING";
    if (closes.length >= 20) {
        const av = annualizedVol(closes.slice(-20));
        if (Number.isFinite(av)) {
            const v = av < 25 ? "BULLISH" : av > 55 ? "BEARISH" : "NEUTRAL";
            votes.push({
                model: "volatility_regime",
                vote: v,
                weight: 0.1,
                detail: `20d realised vol ${(av).toFixed(1)}%`,
            });
            regime = av > 55 ? "VOLATILE" : av < 25 ? "RANGING" : "TRENDING";
            if (av < 25)
                bullish.push(`Low realised vol (${(av).toFixed(1)}%) — calm tape`);
            else if (av > 55)
                bearish.push(`Elevated realised vol (${(av).toFixed(1)}%) — risk-off`);
        }
    }
    // Weighted composite.
    let wsum = 0;
    let wtot = 0;
    for (const x of votes) {
        wsum += toScore(x.vote) * x.weight;
        wtot += x.weight;
    }
    const score = wtot ? clamp(wsum / wtot, -1, 1) : 0;
    const prediction = score > 0.1 ? "UP" : score < -0.1 ? "DOWN" : "FLAT";
    // Logistic map of score to an up-probability in (0.05, 0.95).
    const upProbability = clamp(1 / (1 + Math.exp(-3 * score)), 0.05, 0.95);
    // Confidence from agreement of the weighted votes + data coverage.
    const agree = votes.length > 1
        ? 1 - votes.reduce((a, x) => a + Math.abs(toScore(x.vote) - score) * x.weight, 0) / wtot
        : 0.5;
    const coverage = clamp(votes.length / 5, 0, 1);
    const confidence = clamp(0.4 * agree + 0.6 * coverage, 0, 1);
    return {
        symbol: ticker,
        prediction,
        upProbability: Number(upProbability.toFixed(3)),
        confidence: Number(confidence.toFixed(3)),
        signalStrength: Number(Math.abs(score).toFixed(3)),
        regime,
        modelVotes: votes,
        bullishFactors: bullish,
        bearishFactors: bearish,
        method: "Transparent weighted ensemble of technical structure, momentum, chart patterns, FII flow, and volatility regime. Not a trained ML model.",
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=aiPrediction.js.map