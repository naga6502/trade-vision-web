import { validateSymbol } from "../quant/util.js";
import { getAnalyzeStock } from "./analyzeStock.js";
import { getFundamentals } from "./fundamentals.js";
import { getTechnicalAnalysis } from "./technical.js";
import { getPatternAnalysis } from "./technical.js";
import { getStockQuote } from "./quote.js";
const rupee = (n, dp = 2) => n == null || !Number.isFinite(n) ? "n/a" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: dp })}`;
const pct = (n) => n == null || !Number.isFinite(n) ? "n/a" : `${n.toFixed(1)}%`;
export async function generateStockResearchReport(args) {
    const ticker = validateSymbol(args.symbol);
    const [analyze, fundamentals, tech, patterns, quote] = await Promise.all([
        getAnalyzeStock({ symbol: ticker }).catch(() => null),
        getFundamentals({ symbol: ticker }).catch(() => null),
        getTechnicalAnalysis({ symbol: ticker }).catch(() => null),
        getPatternAnalysis({ symbol: ticker }).catch(() => []),
        getStockQuote({ symbol: ticker }).catch(() => null),
    ]);
    const name = fundamentals?.name ?? quote?.name ?? ticker;
    const L = [];
    L.push(`# ${name} (${ticker})`);
    L.push(`_Research note generated ${new Date().toISOString().slice(0, 10)} — native quant synthesis, not investment advice._`);
    L.push("");
    // Snapshot
    L.push("## Snapshot");
    if (quote) {
        L.push(`- **Price:** ${rupee(quote.price)} (prev close ${rupee(quote.previousClose)})`);
        L.push(`- **52-week range:** ${rupee(quote.fiftyTwoWeekLow)} – ${rupee(quote.fiftyTwoWeekHigh)}`);
        L.push(`- **Volume / ADV:** ${quote.volume.toLocaleString("en-IN")} / ${(quote.averageVolume ?? 0).toLocaleString("en-IN")}`);
        L.push(`- **Market cap:** ${quote.marketCap ? rupee(quote.marketCap / 1e7, 0) + " Cr" : "n/a"}`);
        L.push(`- **P/E (TTM):** ${quote.trailingPE ?? "n/a"} · **Beta:** ${quote.beta ?? "n/a"}`);
    }
    else {
        L.push("- Quote unavailable.");
    }
    L.push("");
    // Technical
    L.push("## Technical Picture");
    if (tech) {
        L.push(`- **Composite:** ${tech.summary.label} (score ${tech.summary.score.toFixed(2)}, ${tech.summary.buy} buy / ${tech.summary.neutral} neutral / ${tech.summary.sell} sell)`);
        L.push(`- **Volatility:** ATR ${rupee(tech.volatility.atr)}, IV(hist) ${pct(tech.volatility.histVol)}, BB width ${pct(tech.volatility.bbWidth)}`);
        const top = [...tech.oscillators, ...tech.movingAverages].slice(0, 6);
        L.push("- **Key signals:** " + top.map((s) => `${s.name} ${s.value} → ${s.signal}`).join("; "));
    }
    else {
        L.push("- Technical analysis unavailable.");
    }
    L.push("");
    // Patterns
    L.push("## Chart Patterns");
    if (patterns.length) {
        for (const row of patterns) {
            const ps = row.patterns.map((p) => `${p.name} (${p.type}${p.forming ? ", forming" : ""})`).join(", ");
            L.push(`- **${row.label}:** ${ps || "none"}`);
        }
    }
    else {
        L.push("- Pattern analysis unavailable.");
    }
    L.push("");
    // Options & vol
    const op = analyze?.components.optionPressure;
    const iv = analyze?.components.ivRadar;
    if (op || iv) {
        L.push("## Options & Volatility");
        if (iv) {
            L.push(`- **ATM IV:** ${iv.atmIv != null ? pct(iv.atmIv) : "n/a"} · **Regime:** ${iv.volatilityRegime}`);
            L.push(`- **IV rank / percentile (realised-vol proxy):** ${iv.ivRank ?? "n/a"} / ${iv.ivPercentile ?? "n/a"}`);
            L.push(`- **Risk reversal:** ${iv.riskReversal ?? "n/a"}`);
        }
        if (op) {
            L.push(`- **Max pain:** ${rupee(op.maxPain)} · **Gamma wall:** ${rupee(op.gammaWall?.strike ?? null)}`);
            L.push(`- **Expected move:** ${rupee(op.expectedMove?.points ?? null)} (${pct(op.expectedMove?.pct ?? null)}) to ${op.expiryDate ?? "n/a"}`);
            if (op.pressureZones.length) {
                L.push("- **Pressure zones:** " + op.pressureZones.map((z) => `${z.role} @ ${rupee(z.strike)} (${pct(z.distancePct)})`).join(", "));
            }
        }
        L.push("");
    }
    // AI & probabilistic
    const ai = analyze?.components.aiPrediction;
    const mc = analyze?.components.monteCarlo;
    L.push("## AI & Probabilistic Read");
    if (ai) {
        L.push(`- **Directional bias:** ${ai.prediction} (up-prob ${(ai.upProbability * 100).toFixed(0)}%, strength ${ai.signalStrength}, regime ${ai.regime})`);
        L.push(`- **Votes:** ${ai.modelVotes.map((v) => `${v.model}=${v.vote}`).join(", ")}`);
    }
    if (mc) {
        L.push(`- **Monte Carlo (${mc.paths} paths / ${mc.horizonDays}d):** median ${rupee(mc.medianPrice)}, 68% range ${rupee(mc.range68[0])}–${rupee(mc.range68[1])}, 90% range ${rupee(mc.range90[0])}–${rupee(mc.range90[1])}`);
        L.push(`- **Probabilities:** above spot ${(mc.probAboveSpot * 100).toFixed(0)}%, -10% drop ${(mc.prob10PctDrop * 100).toFixed(0)}%`);
    }
    L.push("");
    // Backtest
    const eq = analyze?.components.equityCurves;
    if (eq) {
        L.push("## Backtest (trailing " + eq.windowDays + "d)");
        L.push("| Strategy | CAGR | Sharpe | Sortino | Max DD | Win% | Trades |");
        L.push("|---|---|---|---|---|---|---|");
        for (const s of eq.strategies) {
            L.push(`| ${s.strategy} | ${pct(s.annualizedReturnPct)} | ${s.sharpe} | ${s.sortino} | ${pct(s.maxDrawdownPct)} | ${(s.winRate * 100).toFixed(0)}% | ${s.numTrades} |`);
        }
        L.push("");
    }
    // Fundamentals
    if (fundamentals) {
        L.push("## Fundamentals");
        L.push(`- **Margins:** gross ${pct(fundamentals.grossMargins)}, operating ${pct(fundamentals.operatingMargins)}, net ${pct(fundamentals.profitMargins)}`);
        L.push(`- **Returns:** ROE ${pct(fundamentals.returnOnEquity)}, ROA ${pct(fundamentals.returnOnAssets)}`);
        L.push(`- **Leverage:** D/E ${fundamentals.debtToEquity ?? "n/a"}, current ratio ${fundamentals.currentRatio ?? "n/a"}`);
        L.push(`- **Growth:** revenue ${pct(fundamentals.revenueGrowth)}, earnings ${pct(fundamentals.earningsGrowth)}`);
        L.push(`- **Analyst:** mean ${fundamentals.recommendationMean ?? "n/a"} (1=strong buy) · target ${rupee(fundamentals.targetMeanPrice)}`);
        L.push("");
    }
    // Verdict
    if (analyze) {
        L.push("## Verdict");
        L.push(`**${analyze.signal}** — composite ${analyze.score.toFixed(2)}, confidence ${(analyze.confidenceScore * 100).toFixed(0)}%.`);
        if (analyze.bullishFactors.length)
            L.push("- Bullish: " + analyze.bullishFactors.join("; "));
        if (analyze.bearishFactors.length)
            L.push("- Bearish: " + analyze.bearishFactors.join("; "));
        L.push("");
    }
    L.push("---");
    L.push("_Generated by trade-vision MCP from Yahoo Finance + NSE data. Analytics are procedural/quantitative, not personalised investment advice._");
    return {
        symbol: ticker,
        report: L.join("\n"),
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=researchReport.js.map