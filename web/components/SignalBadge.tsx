"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { Fundamentals } from "@/lib/mcp";

interface TvResult {
  display: string;
  isError: boolean;
  error?: string;
}

// Yahoo analyst-consensus fallback (used when the TradingView MCP is off).
function yahooSignal(f: Fundamentals): {
  label: string;
  color: string;
  target: number | null;
} {
  const mean = f.recommendationMean ?? 3;
  let label = "HOLD";
  let color = "warning";
  if (mean <= 1.5) {
    label = "STRONG BUY";
    color = "success";
  } else if (mean <= 2.5) {
    label = "BUY";
    color = "success";
  } else if (mean <= 3.5) {
    label = "HOLD";
    color = "warning";
  } else {
    label = "SELL";
    color = "danger";
  }
  return { label, color, target: f.targetMeanPrice };
}

function parseDecision(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bstrong buy\b/.test(t)) return "STRONG BUY";
  if (/\bbuy\b/.test(t)) return "BUY";
  if (/\bstrong sell\b/.test(t)) return "STRONG SELL";
  if (/\bsell\b/.test(t)) return "SELL";
  if (/\bhold\b/.test(t)) return "HOLD";
  return null;
}

function parseTarget(text: string): number | null {
  const m = text.match(
    /(?:target|price|₹|rs\.?)\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i
  );
  if (m) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function colorFor(label: string): string {
  const l = label.toUpperCase();
  if (l.includes("BUY")) return "success";
  if (l.includes("SELL")) return "danger";
  return "warning";
}

function fmt(n: number | null, d = 2): string {
  return n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: d })}`;
}

export default function SignalBadge({ f }: { f: Fundamentals }) {
  const [tv, setTv] = useState<TvResult | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(
    () => {
      fetchJson<TvResult>(`/api/tradingview?symbol=${encodeURIComponent(f.ticker)}`)
        .then((j) => {
          setTv(j);
          setLoading(false);
        })
        .catch(() => {
          setTv({ display: "", isError: true });
          setLoading(false);
        });
    },
    [f.ticker],
  );

  const y = yahooSignal(f);
  const tvOk = tv && !tv.isError && tv.display.trim().length > 0;
  const label = tvOk ? parseDecision(tv!.display) ?? y.label : y.label;
  const color = tvOk ? colorFor(label) : y.color;
  const target = tvOk ? parseTarget(tv!.display) ?? y.target : y.target;
  const source = tvOk
    ? "TradingView"
    : tv?.isError
      ? "Yahoo consensus (TV off)"
      : "Yahoo consensus";

  const price = f.price;
  const upside =
    target != null && price > 0 ? ((target - price) / price) * 100 : null;

  const trend = f.recommendationTrend?.[0];

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <span className={`badge bg-${color} fs-6 px-3 py-2`}>{label}</span>
        {target != null && (
          <div>
            <div className="small text-muted">Target</div>
            <div className="fw-bold">{fmt(target)}</div>
          </div>
        )}
        {upside != null && (
          <div>
            <div className="small text-muted">Upside</div>
            <div className={upside >= 0 ? "gain-text fw-bold" : "loss-text fw-bold"}>
              {upside >= 0 ? "+" : ""}
              {upside.toFixed(1)}%
            </div>
          </div>
        )}
        <span className="badge bg-secondary-subtle text-secondary border">
          source: {source}
        </span>
        {loading && <span className="spinner-border spinner-border-sm" />}
      </div>

      {trend && (
        <div className="d-flex gap-2 flex-wrap small text-muted">
          <span className="badge text-bg-success">{trend.strongBuy} Strong Buy</span>
          <span className="badge text-bg-success">{trend.buy} Buy</span>
          <span className="badge text-bg-warning">{trend.hold} Hold</span>
          <span className="badge text-bg-danger">{trend.sell} Sell</span>
          <span className="badge text-bg-danger">{trend.strongSell} Strong Sell</span>
        </div>
      )}

      {tvOk && (
        <details className="small">
          <summary className="text-muted" style={{ cursor: "pointer" }}>
            TradingView decision detail
          </summary>
          <pre
            className="bg-light border rounded p-2 mt-1"
            style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}
          >
            {tv!.display}
          </pre>
        </details>
      )}
    </div>
  );
}
