import { validateSymbol } from "../quant/util.js";
import { getAnalyzeStock } from "./analyzeStock.js";
import { getFundamentals } from "./fundamentals.js";
import { getTechnicalAnalysis } from "./technical.js";
import { getPatternAnalysis } from "./technical.js";
import { getStockQuote } from "./quote.js";

// Structured markdown research note synthesising every signal source (quote,
// technicals, patterns, options/vol, AI read, Monte Carlo, backtest,
// fundamentals, aggregate verdict). All data is computed natively.

export interface ResearchReport {
  symbol: string;
  report: string;
  generatedAt: string;
}

export interface ResearchReportArgs {
  /** NSE symbol, e.g. RELIANCE. */
  symbol: string;
}

const NA = "—";

const num = (n: number | null | undefined, dp = 2): string =>
  n == null || !Number.isFinite(n) ? NA : Number(n).toFixed(dp);

const rupee = (n: number | null | undefined, dp = 2): string =>
  n == null || !Number.isFinite(n)
    ? NA
    : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: dp })}`;

const pct = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? NA : `${Number(n).toFixed(1)}%`;

// Compact Indian units: >= 1e7 -> Cr, >= 1e5 -> L, else grouped.
function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return NA;
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  return v.toLocaleString("en-IN");
}

function rupeeCompact(n: number | null | undefined, dp = 0): string {
  if (n == null || !Number.isFinite(n)) return NA;
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(dp)} Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(dp)} L`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const titleCase = (s: string): string =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const VOTE_LABELS: Record<string, string> = {
  chart_patterns: "Chart patterns",
  fii_flow: "FII flow",
  ai_ensemble: "AI ensemble",
  earnings: "Earnings",
  news: "News",
  macro: "Macro",
  options: "Options",
  quant: "Quant",
};

export async function generateStockResearchReport(
  args: ResearchReportArgs,
): Promise<ResearchReport> {
  const ticker = validateSymbol(args.symbol);

  const [analyze, fundamentals, tech, patterns, quote] = await Promise.all([
    getAnalyzeStock({ symbol: ticker }).catch(() => null),
    getFundamentals({ symbol: ticker }).catch(() => null),
    getTechnicalAnalysis({ symbol: ticker }).catch(() => null),
    getPatternAnalysis({ symbol: ticker }).catch(() => [] as any[]),
    getStockQuote({ symbol: ticker }).catch(() => null),
  ]);

  const name = fundamentals?.name ?? quote?.name ?? ticker;
  const L: string[] = [];
  L.push(`# ${name} (${ticker})`);
  L.push(
    `_Research note generated ${new Date().toISOString().slice(0, 10)} — native quant synthesis, not investment advice._`,
  );
  L.push("");

  // Snapshot
  L.push("## Snapshot");
  if (quote) {
    L.push(`- **Price:** ${rupee(quote.price)} (prev close ${rupee(quote.previousClose)})`);
    L.push(
      `- **52-week range:** ${rupee(quote.fiftyTwoWeekLow)} – ${rupee(quote.fiftyTwoWeekHigh)}`,
    );
    L.push(`- **Volume / ADV:** ${compact(quote.volume)} / ${compact(quote.averageVolume)}`);
    L.push(`- **Market cap:** ${rupeeCompact(quote.marketCap, 0)}`);
    L.push(`- **P/E (TTM):** ${num(quote.trailingPE, 2)} · **Beta:** ${num(quote.beta, 2)}`);
  } else {
    L.push("- Quote unavailable.");
  }
  L.push("");

  // Technical
  L.push("## Technical Picture");
  if (tech) {
    L.push(
      `- **Composite:** ${tech.summary.label} (score ${num(tech.summary.score)}, ${tech.summary.buy} buy / ${tech.summary.neutral} neutral / ${tech.summary.sell} sell)`,
    );
    L.push(
      `- **Volatility:** ATR ${rupee(tech.volatility.atr)}, IV(hist) ${pct(tech.volatility.histVol)}, BB width ${pct(tech.volatility.bbWidth)}`,
    );
    const top = [...tech.oscillators, ...tech.movingAverages].slice(0, 6);
    L.push(
      "- **Key signals:** " +
        top.map((s) => `${s.name} ${s.value} → ${s.signal}`).join("; "),
    );
  } else {
    L.push("- Technical data not available.");
  }
  L.push("");

  // Patterns
  L.push("## Chart Patterns");
  if (patterns.length) {
    for (const row of patterns) {
      const ps = row.patterns
        .map(
          (p: any) =>
            `${p.name} (${titleCase(p.type)}${p.forming ? ", forming" : ""})`,
        )
        .join(", ");
      L.push(`- **${row.label}:** ${ps || "none"}`);
    }
  } else {
    L.push("- No chart patterns detected.");
  }
  L.push("");

  // Options & vol
  const op = analyze?.components.optionPressure;
  const iv = analyze?.components.ivRadar;
  if (op || iv) {
    L.push("## Options & Volatility");
    if (iv) {
      L.push(
        `- **ATM IV:** ${iv.atmIv != null ? pct(iv.atmIv) : NA} · **Regime:** ${iv.volatilityRegime}`,
      );
      L.push(
        `- **IV rank / percentile:** ${iv.ivRank ?? NA} / ${iv.ivPercentile ?? NA}`,
      );
      L.push(`- **Risk reversal:** ${iv.riskReversal ?? NA}`);
    }
    if (op) {
      L.push(
        `- **Max pain:** ${rupee(op.maxPain)} · **Gamma wall:** ${rupee(op.gammaWall?.strike ?? null)}`,
      );
      L.push(
        `- **Expected move:** ${rupee(op.expectedMove?.points ?? null)} (${pct(op.expectedMove?.pct ?? null)}) to ${op.expiryDate ?? NA}`,
      );
      if (op.pressureZones.length) {
        L.push(
          "- **Pressure zones:** " +
            op.pressureZones
              .map((z) => `${z.role} @ ${rupee(z.strike)} (${pct(z.distancePct)})`)
              .join(", "),
        );
      }
    }
    L.push("");
  }

  // AI & probabilistic
  const ai = analyze?.components.aiPrediction;
  const mc = analyze?.components.monteCarlo;
  L.push("## AI & Probabilistic Read");
  if (ai) {
    L.push(
      `- **Directional bias:** ${ai.prediction} (up-prob ${(ai.upProbability * 100).toFixed(0)}%, strength ${ai.signalStrength}, regime ${ai.regime})`,
    );
    L.push(
      `- **Votes:** ${ai.modelVotes
        .map((v) => `${VOTE_LABELS[v.model] ?? v.model}: ${titleCase(v.vote)}`)
        .join(" · ")}`,
    );
  }
  if (mc) {
    L.push(
      `- **Monte Carlo (${mc.paths} paths / ${mc.horizonDays}d):** median ${rupee(mc.medianPrice)}, 68% range ${rupee(mc.range68[0])}–${rupee(mc.range68[1])}, 90% range ${rupee(mc.range90[0])}–${rupee(mc.range90[1])}`,
    );
    L.push(
      `- **Probabilities:** above spot ${(mc.probAboveSpot * 100).toFixed(0)}%, -10% drop ${(mc.prob10PctDrop * 100).toFixed(0)}%`,
    );
  }
  if (!ai && !mc) L.push("- No probabilistic model output.");
  L.push("");

  // Backtest
  const eq = analyze?.components.equityCurves;
  if (eq) {
    L.push("## Backtest (trailing " + eq.windowDays + "d)");
    L.push("| Strategy | CAGR | Sharpe | Sortino | Max DD | Win% | Trades |");
    L.push("|---|---|---|---|---|---|---|");
    for (const s of eq.strategies) {
      L.push(
        `| ${s.strategy} | ${pct(s.annualizedReturnPct)} | ${num(s.sharpe, 2)} | ${num(s.sortino, 2)} | ${pct(s.maxDrawdownPct)} | ${(s.winRate * 100).toFixed(0)}% | ${s.numTrades} |`,
      );
    }
    L.push("");
  }

  // Fundamentals
  if (fundamentals) {
    L.push("## Fundamentals");
    L.push(
      `- **Margins:** gross ${pct(fundamentals.grossMargins)}, operating ${pct(fundamentals.operatingMargins)}, net ${pct(fundamentals.profitMargins)}`,
    );
    L.push(
      `- **Returns:** ROE ${pct(fundamentals.returnOnEquity)}, ROA ${pct(fundamentals.returnOnAssets)}`,
    );
    L.push(
      `- **Leverage:** D/E ${num(fundamentals.debtToEquity, 2)}, current ratio ${num(fundamentals.currentRatio, 2)}`,
    );
    L.push(
      `- **Growth:** revenue ${pct(fundamentals.revenueGrowth)}, earnings ${pct(fundamentals.earningsGrowth)}`,
    );
    L.push(
      `- **Analyst:** mean ${num(fundamentals.recommendationMean, 1)} (1=strong buy) · target ${rupee(fundamentals.targetMeanPrice)}`,
    );
    L.push("");
  }

  // Verdict
  if (analyze) {
    L.push("## Verdict");
    L.push(
      `**${analyze.signal}** · composite ${num(analyze.score, 2)} · confidence ${Math.round(analyze.confidenceScore * 100)}%`,
    );
    if (analyze.bullishFactors.length)
      L.push("- Bullish: " + analyze.bullishFactors.join("; "));
    if (analyze.bearishFactors.length)
      L.push("- Bearish: " + analyze.bearishFactors.join("; "));
    L.push("");
  }

  L.push("---");
  L.push(
    "_Generated by trade-vision MCP from Yahoo Finance + NSE data. Analytics are procedural/quantitative, not personalised investment advice._",
  );

  return {
    symbol: ticker,
    report: L.join("\n"),
    generatedAt: new Date().toISOString(),
  };
}
