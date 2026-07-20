"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { IvRadar } from "@/lib/mcp";
import { fmt, fmtPct } from "@/lib/format";

const GRID = "#2a2f3a";
const AXIS = "#8b93a7";
const ACCENT = "#f0b90b";

const REGIME_COLOR: Record<IvRadar["volatilityRegime"], string> = {
  ELEVATED: "#ea3943",
  NORMAL: "#16c784",
  COMPRESSED: "#3b9eff",
  UNKNOWN: "#8b93a7",
};

function Bar({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-mini">
      <div className="muted-text" style={{ fontSize: "0.68rem" }}>{label}</div>
      <div className="fw-semibold mono">{value}</div>
    </div>
  );
}

export default function IvRadarPanel({
  symbol,
  expiry,
  data,
}: {
  symbol: string;
  expiry?: string;
  data?: IvRadar | null;
}) {
  const [d, setD] = useState<IvRadar | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  const q = new URLSearchParams({ symbol });
  if (expiry) q.set("expiry", expiry);

  useAutoRefresh(
    () => {
      if (data) return;
      fetchJson<any>(`/api/options/iv?${q.toString()}`)
        .then((j) => {
          setD(j.error ? null : j);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [symbol, expiry],
    60_000,
  );

  if (data && data !== d) setD(data);

  if (loading)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-radar" /> IV Radar
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
          <i className="bi bi-radar" /> IV Radar
        </div>
        <div className="empty-note">No implied-volatility data.</div>
      </div>
    );

  const smile = (d.smile ?? [])
    .filter((s) => s.iv != null)
    .map((s) => ({ strike: s.strike, iv: Number((s.iv! * 100).toFixed(1)) }));

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-radar" /> IV Radar
        <span
          className="pill ms-2"
          style={{
            borderColor: REGIME_COLOR[d.volatilityRegime],
            color: REGIME_COLOR[d.volatilityRegime],
            fontSize: "0.66rem",
          }}
        >
          {d.volatilityRegime}
        </span>
      </div>

      <div
        className="grid-2 mb-3"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <Bar label="ATM IV" value={d.atmIv != null ? fmtPct(d.atmIv, false) : "—"} />
        <Bar label="IV Rank" value={d.ivRank != null ? `${d.ivRank.toFixed(0)}` : "—"} />
        <Bar
          label="IV %ile"
          value={d.ivPercentile != null ? `${d.ivPercentile.toFixed(0)}` : "—"}
        />
        <Bar
          label="Risk Reversal"
          value={d.riskReversal != null ? fmtPct(d.riskReversal, false) : "—"}
        />
      </div>

      <div className="mb-3">
        <div className="d-flex justify-content-between muted-text small">
          <span>IV Rank (0–100)</span>
          <span>{d.ivRank != null ? d.ivRank.toFixed(0) : "—"}</span>
        </div>
        <div className="progress" style={{ height: 6, background: "var(--surface-3)" }}>
          <div
            className="progress-bar"
            style={{
              width: `${d.ivRank ?? 0}%`,
              background:
                (d.ivRank ?? 0) > 70 ? "#ea3943" : (d.ivRank ?? 0) < 30 ? "#3b9eff" : ACCENT,
            }}
          />
        </div>
      </div>

      {smile.length > 1 ? (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                dataKey="strike"
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
                formatter={(v: number) => [`${v}%`, "IV"]}
                labelFormatter={(v) => `Strike ₹${fmt(v as number, 0)}`}
              />
              <Line
                type="monotone"
                dataKey="iv"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="muted-text text-center" style={{ fontSize: "0.66rem" }}>
            IV skew by strike (volatility smile)
          </div>
        </div>
      ) : (
        <div className="empty-note">IV smile unavailable.</div>
      )}

      {d.notes?.length > 0 && (
        <div className="muted-text mt-2" style={{ fontSize: "0.7rem" }}>
          {d.notes.map((n, i) => (
            <div key={i}>• {n}</div>
          ))}
        </div>
      )}
    </div>
  );
}
