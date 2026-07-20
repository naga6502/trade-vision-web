"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { OptionPressure } from "@/lib/mcp";
import { fmt, fmtPct, fmtInt } from "@/lib/format";

const CALL = "#ea3943";
const PUT = "#16c784";

export default function OptionPressurePanel({
  symbol,
  expiry,
  data,
}: {
  symbol: string;
  expiry?: string;
  data?: OptionPressure | null;
}) {
  const [d, setD] = useState<OptionPressure | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  const q = new URLSearchParams({ symbol });
  if (expiry) q.set("expiry", expiry);

  useAutoRefresh(
    () => {
      if (data) return;
      fetchJson<any>(`/api/options/pressure?${q.toString()}`)
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
          <i className="bi bi-intersect" /> Option Pressure
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
          <i className="bi bi-intersect" /> Option Pressure
        </div>
        <div className="empty-note">No option-chain pressure data.</div>
      </div>
    );

  const maxOi = Math.max(1, ...d.pressureZones.map((z) => z.oi));

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-intersect" /> Option Pressure
        {d.expiryDate && (
          <span className="muted-text ms-2" style={{ fontSize: "0.7rem" }}>
            exp {d.expiryDate}
            {d.daysToExpiry != null ? ` · ${d.daysToExpiry}d` : ""}
          </span>
        )}
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
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Max Pain</div>
          <div className="fw-semibold mono">₹{fmt(d.maxPain, 0)}</div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Expected Move</div>
          <div className="fw-semibold mono">
            {d.expectedMove.pct != null ? fmtPct(d.expectedMove.pct, false) : "—"}
          </div>
          <div className="muted-text" style={{ fontSize: "0.66rem" }}>
            {d.expectedMove.points != null ? `₹${fmt(d.expectedMove.points, 0)}` : ""} ·{" "}
            {d.expectedMove.method}
          </div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Gamma Wall</div>
          <div className="fw-semibold mono">
            {d.gammaWall ? `₹${fmt(d.gammaWall.strike, 0)}` : "—"}
          </div>
        </div>
        <div className="stat-mini">
          <div className="muted-text" style={{ fontSize: "0.68rem" }}>Squeeze</div>
          <div className="fw-semibold mono" style={{ fontSize: "0.78rem" }}>
            {d.squeezeTargets?.up != null ? `▲${fmt(d.squeezeTargets.up, 0)}` : "—"}
            {" / "}
            {d.squeezeTargets?.down != null ? `▼${fmt(d.squeezeTargets.down, 0)}` : "—"}
          </div>
        </div>
      </div>

      {d.pressureZones?.length > 0 && (
        <div className="mb-2">
          <div className="muted-text small mb-1">Pressure zones (OI)</div>
          <div className="d-flex flex-column gap-1">
            {d.pressureZones.map((z, i) => {
              const isCall = z.role === "CALL_RESISTANCE";
              const col = isCall ? CALL : PUT;
              return (
                <div key={i} className="d-flex align-items-center gap-2 small">
                  <span style={{ minWidth: 92, color: col, fontWeight: 600 }}>
                    ₹{fmt(z.strike, 0)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "var(--surface-3)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(z.oi / maxOi) * 100}%`,
                        height: "100%",
                        background: col,
                      }}
                    />
                  </div>
                  <span className="muted-text" style={{ minWidth: 54, textAlign: "right" }}>
                    {fmtInt(z.oi)}
                  </span>
                  <span
                    className="muted-text"
                    style={{ minWidth: 48, textAlign: "right" }}
                  >
                    {fmtPct(z.distancePct, false)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="muted-text mt-1" style={{ fontSize: "0.66rem" }}>
            <span style={{ color: CALL }}>■</span> call resistance
            <span className="ms-2" style={{ color: PUT }}>■</span> put support ·
            distance = % from underlying
          </div>
        </div>
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
