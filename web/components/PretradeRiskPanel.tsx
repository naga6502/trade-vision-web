"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { PretradeRiskScan } from "@/lib/mcp";
import { fmt, fmtInt, fmtPct, fmtCompact } from "@/lib/format";
import QuantDisclaimer from "@/components/QuantDisclaimer";

const REC_COLOR: Record<PretradeRiskScan["recommendation"], string> = {
  PROCEED: "#16c784",
  PROCEED_WITH_STOP: "#f0b90b",
  REDUCE_SIZE: "#ff9f43",
  AVOID: "#ea3943",
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-mini">
      <div className="muted-text" style={{ fontSize: "0.68rem" }}>
        {label}
      </div>
      <div className="fw-semibold mono">{value}</div>
      {sub && <div className="muted-text" style={{ fontSize: "0.66rem" }}>{sub}</div>}
    </div>
  );
}

export default function PretradeRiskPanel({
  symbol,
  data,
  entryPrice,
  riskRupees,
  stopMultiple,
}: {
  symbol: string;
  data?: PretradeRiskScan | null;
  entryPrice?: number;
  riskRupees?: number;
  stopMultiple?: number;
}) {
  const [d, setD] = useState<PretradeRiskScan | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  const q = (() => {
    const p = new URLSearchParams({ symbol });
    if (entryPrice != null) p.set("entryPrice", String(entryPrice));
    if (riskRupees != null) p.set("riskRupees", String(riskRupees));
    if (stopMultiple != null) p.set("stopMultiple", String(stopMultiple));
    return p.toString();
  })();

  useAutoRefresh(
    () => {
      if (data) return;
      fetch(`/api/pretrade-risk?${q}`)
        .then((r) => r.json())
        .then((j) => {
          setD(j.error ? null : j);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [symbol, q],
    60_000,
  );

  if (data && data !== d) setD(data);

  if (loading)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-shield-check" /> Pre-Trade Risk
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
          <i className="bi bi-shield-check" /> Pre-Trade Risk
        </div>
        <div className="empty-note">No risk scan available.</div>
      </div>
    );

  const rc = REC_COLOR[d.recommendation];

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-shield-check" /> Pre-Trade Risk
      </div>

      <div
        className="d-flex align-items-center justify-content-between mb-3"
        style={{
          borderLeft: `4px solid ${rc}`,
          paddingLeft: 10,
        }}
      >
        <div>
          <div className="muted-text small">Call</div>
          <div className="fw-bold" style={{ color: rc, fontSize: "1.15rem" }}>
            {d.recommendation.replace(/_/g, " ")}
          </div>
        </div>
        <div className="text-end">
          <div className="muted-text small">Liquidity</div>
          <div className="fw-semibold">{d.liquidity.liquidityScore}</div>
        </div>
      </div>

      <div
        className="grid-2 mb-3"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <Stat
          label="ATR (14)"
          value={`₹${fmt(d.volatility.atr)}`}
          sub={fmtPct(d.volatility.atrPct, false)}
        />
        <Stat
          label="Ann. Vol"
          value={fmtPct(d.volatility.annualizedVolPct, false)}
          sub={d.volatility.beta != null ? `β ${fmt(d.volatility.beta)}` : undefined}
        />
        <Stat
          label="Suggested Stop"
          value={`₹${fmt(d.stopLoss.suggestedPrice)}`}
          sub={`${fmt(d.stopLoss.riskPerShare)}/sh · ${d.stopLoss.stopMultiple}×ATR`}
        />
        <Stat
          label="Max Shares"
          value={fmtInt(d.positionSizing.maxShares)}
          sub={`${fmtInt(d.positionSizing.maxLots)} lots`}
        />
        <Stat
          label="Max Notional"
          value={`₹${fmtCompact(d.positionSizing.maxNotional)}`}
          sub={`risk ₹${fmtInt(d.positionSizing.riskRupees)}`}
        />
        <Stat
          label="Gap Risk"
          value={fmtPct(d.gapRiskPct, false)}
          sub={
            d.earningsInDays != null
              ? `earnings ${d.earningsInDays}d`
              : "no earnings soon"
          }
        />
      </div>

      {d.flags?.length > 0 && (
        <div className="d-flex flex-wrap gap-1">
          {d.flags.map((f, i) => (
            <span key={i} className="pill" style={{ fontSize: "0.66rem" }}>
              {f}
            </span>
          ))}
        </div>
      )}

      <QuantDisclaimer text="Position sizing is a heuristic based on ATR risk and your capital. Not investment advice." />
    </div>
  );
}
