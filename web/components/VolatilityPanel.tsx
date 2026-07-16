"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { Technical } from "@/lib/mcp";
import { fmt, fmtPct } from "@/lib/format";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="muted-text">{label}</td>
      <td className="text-end mono">{value}</td>
    </tr>
  );
}

export default function VolatilityPanel({ symbol }: { symbol: string }) {
  const [v, setV] = useState<Technical["volatility"] | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(
    () => {
      fetch(`/api/technical?symbol=${encodeURIComponent(symbol)}`)
        .then((r) => r.json())
        .then((j) => {
          setV(j.volatility ?? null);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [symbol],
  );

  const atr = v?.atr ?? NaN;
  const bb = v?.bbWidth ?? NaN;
  const hv = v?.histVol ?? NaN;

  // Relative Bollinger width: tight (<2%) = low vol / squeezing, wide (>4%) = high vol.
  const bbNote = Number.isNaN(bb)
    ? ""
    : bb < 2
      ? "tight"
      : bb > 4
        ? "expanded"
        : "normal";

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-activity" /> Volatility
      </div>
      {loading ? (
        <div className="text-center text-muted py-3">
          <span className="spinner-border spinner-border-sm" />
        </div>
      ) : (
        <table className="table table-sm mb-0">
          <tbody>
            <Row label="ATR (14)" value={Number.isNaN(atr) ? "—" : `₹${fmt(atr)}`} />
            <Row
              label="Bollinger Width"
              value={Number.isNaN(bb) ? "—" : `${fmt(bb)}% ${bbNote}`}
            />
            <Row
              label="Hist. Volatility (20d)"
              value={Number.isNaN(hv) ? "—" : fmtPct(hv, false)}
            />
          </tbody>
        </table>
      )}
      <div className="muted-text mt-2" style={{ fontSize: "0.7rem" }}>
        ATR = average true range · BB Width = (upper−lower)/mid · HV = annualised
        std-dev of daily returns.
      </div>
    </div>
  );
}
