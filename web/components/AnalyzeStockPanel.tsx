"use client";

import type { AnalyzeStock, Verdict } from "@/lib/mcp";
import AiPredictionPanel from "@/components/AiPredictionPanel";
import IvRadarPanel from "@/components/IvRadarPanel";
import OptionPressurePanel from "@/components/OptionPressurePanel";
import MonteCarloPanel from "@/components/MonteCarloPanel";
import EquityCurvesPanel from "@/components/EquityCurvesPanel";
import QuantDisclaimer from "@/components/QuantDisclaimer";

const VERDICT_COLOR: Record<Verdict, string> = {
  "STRONG BUY": "#16c784",
  BUY: "#3ad29f",
  NEUTRAL: "#8b93a7",
  SELL: "#ff7a7a",
  "STRONG SELL": "#ea3943",
};

export default function AnalyzeStockPanel({
  symbol,
  data,
}: {
  symbol: string;
  data?: AnalyzeStock | null;
}) {
  if (!data)
    return (
      <div className="empty-note">No analysis available for {symbol}.</div>
    );

  const c = VERDICT_COLOR[data.signal];
  const comp = data.components;

  return (
    <div>
      <div className="panel mb-3" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-clipboard2-pulse" /> Analyze Stock · Aggregate Verdict
        </div>
        <div className="d-flex align-items-center gap-3 mb-2">
          <span
            className="fw-bold"
            style={{ fontSize: "1.5rem", color: c, letterSpacing: "0.02em" }}
          >
            {data.signal}
          </span>
          <span
            className="pill"
            style={{ borderColor: c, color: c, fontSize: "0.7rem" }}
          >
            confidence {data.confidenceScore?.toFixed?.(0) ?? data.confidenceScore}
          </span>
          <span className="muted-text small mono">
            score {data.score?.toFixed?.(1) ?? data.score}
          </span>
        </div>
        {data.summary && (
          <div className="muted-text" style={{ fontSize: "0.85rem" }}>
            {data.summary}
          </div>
        )}

        <div className="grid-2 mt-3">
          <div>
            <div className="muted-text small mb-1 text-success">Bullish</div>
            <ul className="small ps-3 mb-0" style={{ color: "#16c784" }}>
              {data.bullishFactors?.length ? (
                data.bullishFactors.map((f, i) => <li key={i}>{f}</li>)
              ) : (
                <li className="muted-text">None</li>
              )}
            </ul>
          </div>
          <div>
            <div className="muted-text small mb-1" style={{ color: "#ea3943" }}>
              Bearish
            </div>
            <ul className="small ps-3 mb-0" style={{ color: "#ea3943" }}>
              {data.bearishFactors?.length ? (
                data.bearishFactors.map((f, i) => <li key={i}>{f}</li>)
              ) : (
                <li className="muted-text">None</li>
              )}
            </ul>
          </div>
        </div>
        <QuantDisclaimer />
      </div>

      <div className="grid-2">
        <AiPredictionPanel symbol={symbol} data={comp?.aiPrediction ?? null} />
        <IvRadarPanel symbol={symbol} data={comp?.ivRadar ?? null} />
        <OptionPressurePanel symbol={symbol} data={comp?.optionPressure ?? null} />
        <MonteCarloPanel symbol={symbol} data={comp?.monteCarlo ?? null} />
        <div style={{ gridColumn: "1 / -1" }}>
          <EquityCurvesPanel symbol={symbol} data={comp?.equityCurves ?? null} />
        </div>
      </div>
    </div>
  );
}
