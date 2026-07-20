"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { AiPrediction, ModelVote } from "@/lib/mcp";
import QuantDisclaimer from "@/components/QuantDisclaimer";

const UP = "#16c784";
const DOWN = "#ea3943";
const FLAT = "#8b93a7";

function verdictColor(p: AiPrediction["prediction"]): string {
  return p === "UP" ? UP : p === "DOWN" ? DOWN : FLAT;
}

// Values are 0..1 fractions in the tool; normalise either way.
const pct = (x: number | undefined) =>
  x == null || Number.isNaN(x) ? "—" : `${(x <= 1 ? x * 100 : x).toFixed(0)}%`;

function voteColor(v: ModelVote["vote"]): string {
  return v === "BULLISH" ? UP : v === "BEARISH" ? DOWN : FLAT;
}

export default function AiPredictionPanel({
  symbol,
  data,
}: {
  symbol: string;
  data?: AiPrediction | null;
}) {
  const [d, setD] = useState<AiPrediction | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  useAutoRefresh(
    () => {
      if (data) return;
      fetchJson<any>(`/api/ai-prediction?symbol=${encodeURIComponent(symbol)}`)
        .then((j) => {
          setD(j.error ? null : j);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [symbol],
    60_000,
  );

  // Keep in sync if parent passes fresh data (e.g. from /api/analyze).
  if (data && data !== d) setD(data);

  if (loading)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-cpu" /> AI Prediction
        </div>
        <div className="text-center text-muted py-3">
          <span className="spinner-border spinner-border-sm" />
        </div>
      </div>
    );

  if (!d)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-cpu" /> AI Prediction
        </div>
        <div className="empty-note">No prediction available.</div>
      </div>
    );

  const c = verdictColor(d.prediction);

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-cpu" /> AI Prediction
      </div>

      <div className="d-flex align-items-center gap-3 mb-3">
        <span
          className="fw-bold"
          style={{
            fontSize: "1.4rem",
            color: c,
            letterSpacing: "0.02em",
          }}
        >
          {d.prediction}
        </span>
        <span
          className="pill"
          style={{ borderColor: c, color: c }}
        >
          {d.regime}
        </span>
      </div>

      <div className="mb-2">
        <div className="d-flex justify-content-between muted-text small">
          <span>Confidence</span>
          <span>{pct(d.confidence)}</span>
        </div>
        <div className="progress" style={{ height: 6, background: "var(--surface-3)" }}>
          <div
            className="progress-bar"
            style={{ width: pct(d.confidence), background: c }}
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="d-flex justify-content-between muted-text small">
          <span>Up probability</span>
          <span>{pct(d.upProbability)}</span>
        </div>
        <div className="progress" style={{ height: 6, background: "var(--surface-3)" }}>
          <div
            className="progress-bar"
            style={{ width: pct(d.upProbability), background: UP }}
          />
        </div>
      </div>

      {d.modelVotes?.length > 0 && (
        <div className="mb-3">
          <div className="muted-text small mb-1">Model votes</div>
          <div className="d-flex flex-column gap-1">
            {d.modelVotes.map((m, i) => (
              <div key={i} className="d-flex align-items-center gap-2 small">
                <span
                  className="rounded-circle"
                  style={{
                    width: 8,
                    height: 8,
                    background: voteColor(m.vote),
                  }}
                />
                <span className="fw-semibold" style={{ minWidth: 92 }}>
                  {m.model}
                </span>
                <span className="muted-text" style={{ flex: 1 }}>
                  {m.detail}
                </span>
                <span style={{ color: voteColor(m.vote) }}>{m.vote}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2 mb-2">
        <div>
          <div className="muted-text small mb-1 text-success">Bullish</div>
          <ul className="small ps-3 mb-0" style={{ color: UP }}>
            {d.bullishFactors?.length
              ? d.bullishFactors.map((f, i) => <li key={i}>{f}</li>)
              : <li className="muted-text">None</li>}
          </ul>
        </div>
        <div>
          <div className="muted-text small mb-1" style={{ color: DOWN }}>
            Bearish
          </div>
          <ul className="small ps-3 mb-0" style={{ color: DOWN }}>
            {d.bearishFactors?.length
              ? d.bearishFactors.map((f, i) => <li key={i}>{f}</li>)
              : <li className="muted-text">None</li>}
          </ul>
        </div>
      </div>

      <QuantDisclaimer />
    </div>
  );
}
