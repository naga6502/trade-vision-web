"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { PatternAnalysis, DetectedPattern, PatternHorizon } from "@/lib/mcp";

const typeColor = (t: string) =>
  t === "BULLISH"
    ? { fg: "var(--gain)", bg: "rgba(22,199,132,0.12)", bd: "rgba(22,199,132,0.32)" }
    : t === "BEARISH"
      ? { fg: "var(--loss)", bg: "rgba(246,70,93,0.12)", bd: "rgba(246,70,93,0.32)" }
      : { fg: "var(--muted)", bg: "rgba(140,150,170,0.12)", bd: "rgba(140,150,170,0.3)" };

const confLabel: Record<string, string> = {
  HIGH: "HIGH",
  MEDIUM: "MED",
  LOW: "LOW",
};

const horizonIcon: Record<PatternHorizon, string> = {
  intraday: "bi-lightning-charge",
  short: "bi-clock-history",
  long: "bi-graph-up-arrow",
};

function PatternCard({ row }: { row: PatternAnalysis[number] }) {
  const hasData = row.patterns.length > 0;
  return (
    <div className="panel" style={{ padding: 12, display: "flex", flexDirection: "column", minHeight: 160 }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className={`bi ${horizonIcon[row.horizon]}`} style={{ color: "var(--accent)" }} />
        <div className="fw-semibold" style={{ fontSize: "0.82rem" }}>{row.label}</div>
        <span className="pill ms-auto" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
          {row.interval} · {row.bars}b
        </span>
      </div>

      {!hasData ? (
        <div className="empty-note small">No clear formation on this timeframe.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {row.patterns.map((p, i) => (
            <PatternRow key={`${p.name}-${i}`} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PatternRow({ p }: { p: DetectedPattern }) {
  const c = typeColor(p.type);
  return (
    <div
      className="rounded"
      style={{ borderLeft: `3px solid ${c.bd}`, background: c.bg, padding: "6px 8px" }}
    >
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="fw-semibold" style={{ color: c.fg, fontSize: "0.8rem" }}>
          {p.name}
        </span>
        {p.forming && (
          <span
            className="pill"
            style={{
              fontSize: "0.58rem",
              padding: "0 5px",
              color: c.fg,
              borderColor: c.bd,
              background: "transparent",
            }}
          >
            <span
              className="spinner-grow spinner-grow-sm me-1"
              style={{ width: 6, height: 6, color: c.fg }}
            />
            FORMING
          </span>
        )}
        {p.confidence && (
          <span className="ms-auto muted-text" style={{ fontSize: "0.58rem", letterSpacing: "0.04em" }}>
            {confLabel[p.confidence] ?? p.confidence} CONF
          </span>
        )}
      </div>
      <div className="muted-text mt-1" style={{ fontSize: "0.7rem", lineHeight: 1.35 }}>
        {p.note}
      </div>
    </div>
  );
}

export default function PatternRecognition({ symbol }: { symbol: string }) {
  const [data, setData] = useState<PatternAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(
    () => {
      fetch(`/api/pattern-analysis?symbol=${encodeURIComponent(symbol)}`)
        .then((r) => r.json())
        .then((j) => {
          setData(Array.isArray(j) ? j : null);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [symbol],
  );

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-intersect" /> Pattern Recognition
      </div>
      <div className="muted-text mb-2" style={{ fontSize: "0.7rem" }}>
        Candle &amp; chart geometry read across three horizons — intraday, short-term, and
        long-term. <span className="fw-semibold">FORMING</span> marks structures still
        building on the live bar.
      </div>

      {loading ? (
        <div className="text-center text-muted py-4">
          <span className="spinner-border spinner-border-sm" />
        </div>
      ) : data ? (
        <div className="grid-3 gap-2">
          {data.map((row) => (
            <PatternCard key={row.horizon} row={row} />
          ))}
        </div>
      ) : (
        <div className="empty-note">Pattern data unavailable.</div>
      )}
    </div>
  );
}
