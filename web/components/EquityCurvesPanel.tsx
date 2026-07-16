"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import type { EquityCurvesResult, EquityMetrics } from "@/lib/mcp";
import { fmt, fmtPct } from "@/lib/format";
import QuantDisclaimer from "@/components/QuantDisclaimer";

const GRID = "#2a2f3a";
const AXIS = "#8b93a7";
const UP = "#16c784";
const DOWN = "#ea3943";

function metric(v: number, kind: "pct" | "num" | "ratio"): string {
  if (Number.isNaN(v)) return "—";
  if (kind === "pct") return fmtPct(v, false);
  if (kind === "ratio") return v.toFixed(2);
  return fmt(v, 2);
}

export default function EquityCurvesPanel({
  symbol,
  windowDays,
  data,
}: {
  symbol: string;
  windowDays?: number;
  data?: EquityCurvesResult | null;
}) {
  const [d, setD] = useState<EquityCurvesResult | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  const q = new URLSearchParams({ symbol });
  if (windowDays) q.set("windowDays", String(windowDays));

  useAutoRefresh(
    () => {
      if (data) return;
      fetch(`/api/equity-curves?${q.toString()}`)
        .then((r) => r.json())
        .then((j) => {
          setD(j.error ? null : j);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [symbol, windowDays],
    5 * 60_000,
  );

  if (data && data !== d) setD(data);

  if (loading)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-graph-up-arrow" /> Equity Curves
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
          <i className="bi bi-graph-up-arrow" /> Equity Curves
        </div>
        <div className="empty-note">No backtest available.</div>
      </div>
    );

  const chart = (d.strategies ?? []).map((s) => ({
    name: s.strategy,
    ret: Number(s.cumulativeReturnPct.toFixed(1)),
  }));

  const cols: { key: keyof EquityMetrics; label: string; kind: "pct" | "num" | "ratio" }[] = [
    { key: "cumulativeReturnPct", label: "Cum %", kind: "pct" },
    { key: "annualizedReturnPct", label: "Ann %", kind: "pct" },
    { key: "sharpe", label: "Sharpe", kind: "ratio" },
    { key: "sortino", label: "Sortino", kind: "ratio" },
    { key: "maxDrawdownPct", label: "MaxDD %", kind: "pct" },
    { key: "winRate", label: "Win %", kind: "pct" },
    { key: "numTrades", label: "Trades", kind: "num" },
  ];

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-graph-up-arrow" /> Equity Curves
        <span className="muted-text ms-2" style={{ fontSize: "0.7rem" }}>
          {d.windowDays}d · {d.bars} bars
        </span>
      </div>

      <div className="table-responsive mb-3">
        <table className="table table-sm mb-0">
          <thead>
            <tr className="muted-text" style={{ fontSize: "0.7rem" }}>
              <th>Strategy</th>
              {cols.map((c) => (
                <th key={c.key} className="text-end">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.strategies.map((s) => (
              <tr key={s.strategy}>
                <td className="fw-semibold">{s.strategy}</td>
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className="text-end mono"
                    style={{
                      color:
                        c.kind === "pct" && c.key !== "maxDrawdownPct"
                          ? (s[c.key] as number) >= 0
                            ? UP
                            : DOWN
                          : c.key === "maxDrawdownPct"
                            ? DOWN
                            : undefined,
                    }}
                  >
                    {metric(s[c.key] as number, c.kind)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chart.length > 0 && (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={AXIS} tick={{ fontSize: 10 }} />
              <YAxis stroke={AXIS} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: "#0e1116",
                  border: "1px solid #2a2f3a",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`, "Cum return"]}
              />
              <Bar dataKey="ret" radius={[2, 2, 0, 0]}>
                {chart.map((c, i) => (
                  <Cell key={i} fill={c.ret >= 0 ? UP : DOWN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="muted-text text-center" style={{ fontSize: "0.66rem" }}>
            Cumulative return by strategy
          </div>
        </div>
      )}

      <QuantDisclaimer text="Backtest on historical bars only. Past performance does not predict future results. Not investment advice." />
    </div>
  );
}
