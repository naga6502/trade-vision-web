"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { Technical, TechSignal } from "@/lib/mcp";

const sigClass = (s: TechSignal["signal"]) =>
  s === "BUY" ? "gain-text" : s === "SELL" ? "loss-text" : "muted-text";

function Gauge({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100; // -1..+1 -> 0..100%
  return (
    <div>
      <div className="ta-gauge">
        <div className="ta-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="ta-scale">
        <span>Sell</span>
        <span>Neutral</span>
        <span>Buy</span>
      </div>
    </div>
  );
}

function TechTable({ rows }: { rows: TechSignal[] }) {
  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>
          <th>Indicator</th>
          <th>Value</th>
          <th className="text-end">Signal</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td className="mono">{r.value}</td>
            <td className={`text-end fw-semibold ${sigClass(r.signal)}`}>{r.signal}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TechnicalAnalysis({
  symbol,
  data,
  height,
}: {
  symbol: string;
  data?: Technical | null;
  height?: number;
}) {
  const [fetched, setFetched] = useState<Technical | null>(data ?? null);
  const [loading, setLoading] = useState(data == null);
  const [err, setErr] = useState<string | null>(null);

  useAutoRefresh(
    () => {
      if (data != null) {
        setFetched(data);
        setLoading(false);
        setErr(null);
        return;
      }
      fetch(`/api/technical?symbol=${encodeURIComponent(symbol)}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.error) {
            setErr(j.error);
            setFetched(null);
          } else {
            setFetched(j);
            setErr(null);
          }
          setLoading(false);
        })
        .catch((e) => {
          setErr(String(e));
          setLoading(false);
        });
    },
    [symbol, data],
  );

  if (loading) {
    return (
      <div className="text-center text-muted py-5">
        <span className="spinner-border spinner-border-sm me-2" /> Loading technical analysis…
      </div>
    );
  }
  if (err) {
    return <div className="alert alert-warning mb-0">{err}</div>;
  }
  if (!fetched) return null;

  const { summary, oscillators, movingAverages } = fetched;

  return (
    <div>
      <Gauge score={summary.score} />

      <div className="grid-2 mt-3">
        <div>
          <div
            className="muted-text mb-2"
            style={{ fontSize: "0.74rem", fontWeight: 600 }}
          >
            OSCILLATORS
          </div>
          <TechTable rows={oscillators} />
        </div>
        <div>
          <div
            className="muted-text mb-2"
            style={{ fontSize: "0.74rem", fontWeight: 600 }}
          >
            MOVING AVERAGES
          </div>
          <TechTable rows={movingAverages} />
        </div>
      </div>
    </div>
  );
}
