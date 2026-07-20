"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
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
import type { MonteCarloResult } from "@/lib/mcp";
import { fmt, fmtPct } from "@/lib/format";
import QuantDisclaimer from "@/components/QuantDisclaimer";

const GRID = "#2a2f3a";
const AXIS = "#8b93a7";
const UP = "#16c784";
const DOWN = "#ea3943";

export default function MonteCarloPanel({
  symbol,
  data,
}: {
  symbol: string;
  data?: MonteCarloResult | null;
}) {
  const [d, setD] = useState<MonteCarloResult | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  useAutoRefresh(
    () => {
      if (data) return;
      fetchJson<any>(`/api/monte-carlo?symbol=${encodeURIComponent(symbol)}`)
        .then((j) => {
          setD(j.error ? null : j);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [symbol],
    5 * 60_000,
  );

  if (data && data !== d) setD(data);

  if (loading)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-bezier" /> Monte Carlo (GBM)
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
          <i className="bi bi-bezier" /> Monte Carlo (GBM)
        </div>
        <div className="empty-note">No simulation available.</div>
      </div>
    );

  const hist = (d.distribution ?? []).map((b) => ({
    x: b.bucketLow,
    p: Number((b.prob * 100).toFixed(2)),
    above: b.bucketLow >= d.spot,
  }));

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-bezier" /> Monte Carlo (GBM · {fmt(d.paths, 0)} paths /{" "}
        {d.horizonDays}d)
      </div>

      <div
        className="grid-2 mb-3"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Spot</div>
          <div className="fw-semibold mono">₹{fmt(d.spot, 0)}</div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Mean</div>
          <div className="fw-semibold mono">₹{fmt(d.meanPrice, 0)}</div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Median</div>
          <div className="fw-semibold mono">₹{fmt(d.medianPrice, 0)}</div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Ann. Vol</div>
          <div className="fw-semibold mono">{fmtPct(d.annualVolPct, false)}</div>
        </div>
      </div>

      <div
        className="grid-2 mb-3"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
      >
        <div
          className="stat-mini"
          style={{ borderLeft: `3px solid ${AXIS}`, paddingLeft: 8 }}
        >
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>68% Range</div>
          <div className="fw-semibold mono" style={{ fontSize: "0.8rem" }}>
            ₹{fmt(d.range68[0], 0)} – ₹{fmt(d.range68[1], 0)}
          </div>
        </div>
        <div
          className="stat-mini"
          style={{ borderLeft: `3px solid ${AXIS}`, paddingLeft: 8 }}
        >
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>90% Range</div>
          <div className="fw-semibold mono" style={{ fontSize: "0.8rem" }}>
            ₹{fmt(d.range90[0], 0)} – ₹{fmt(d.range90[1], 0)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>P(above spot)</div>
          <div className="fw-semibold mono" style={{ color: UP }}>
            {fmtPct(d.probAboveSpot, false)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>P(−10%)</div>
          <div className="fw-semibold mono" style={{ color: DOWN }}>
            {fmtPct(d.prob10PctDrop, false)}
          </div>
        </div>
      </div>

      {hist.length > 0 && (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hist} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                stroke={AXIS}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => fmt(v, 0)}
              />
              <YAxis
                stroke={AXIS}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0e1116",
                  border: "1px solid #2a2f3a",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`, "Prob"]}
                labelFormatter={(v) => `≤ ₹${fmt(v as number, 0)}`}
              />
              <Bar dataKey="p" radius={[2, 2, 0, 0]}>
                {hist.map((h, i) => (
                  <Cell key={i} fill={h.above ? UP : DOWN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="muted-text text-center" style={{ fontSize: "0.66rem" }}>
            Terminal-price distribution · green = above spot, red = below
          </div>
        </div>
      )}

      <QuantDisclaimer text="Geometric Brownian motion using historical drift/vol. Random simulation, not a forecast. Not investment advice." />
    </div>
  );
}
