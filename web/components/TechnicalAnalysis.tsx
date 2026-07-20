"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { Technical, TechSignal, ConfluenceLevel } from "@/lib/mcp";

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

function TradePlan({
  plan,
  price,
}: {
  plan: Technical["confluence"];
  price: number;
}) {
  const rup = (x: number) =>
    "₹" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const GAIN = "#16c784";
  const LOSS = "#ea3943";

  const zoneCard = (
    title: string,
    color: string,
    zone: ConfluenceLevel | null,
    stop: number | null,
    target: number | null,
    rrr: number | null,
  ) => {
    if (!zone) {
      return (
        <div className="muted-text small" style={{ fontSize: "0.74rem" }}>
          {title}: no clear zone
        </div>
      );
    }
    return (
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>
        <div className="fw-semibold" style={{ color, fontSize: "0.8rem" }}>
          {title}
        </div>
        <div className="mono small">
          {rup(zone.low)} – {rup(zone.high)}{" "}
          <span className="muted-text">({zone.strength} tools)</span>
        </div>
        <div className="small mt-1">
          <span className="muted-text">Stop </span>
          <span className="mono" style={{ color: LOSS }}>
            {stop != null ? rup(stop) : "—"}
          </span>{" "}
          <span className="muted-text">Target </span>
          <span className="mono" style={{ color: GAIN }}>
            {target != null ? rup(target) : "—"}
          </span>
          {rrr != null && (
            <span className="muted-text"> · R:R {rrr.toFixed(2)}</span>
          )}
        </div>
        <div className="mt-1">
          {zone.sources.map((s) => (
            <span
              key={s}
              className="me-1"
              style={{
                fontSize: "0.6rem",
                border: "1px solid rgba(128,128,128,0.4)",
                borderRadius: 10,
                padding: "1px 6px",
                color: "var(--muted, #9aa0aa)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-3">
      <div
        className="muted-text mb-2"
        style={{ fontSize: "0.74rem", fontWeight: 600 }}
      >
        TRADE PLAN · CONFLUENCE
      </div>
      <div className="grid-2">
        {zoneCard(
          "BUY ZONE",
          GAIN,
          plan.buyZone,
          plan.longStop,
          plan.longTarget,
          plan.longRRR,
        )}
        {zoneCard(
          "SELL ZONE",
          LOSS,
          plan.sellZone,
          plan.shortStop,
          plan.shortTarget,
          plan.shortRRR,
        )}
      </div>
      {plan.levels.length > 0 &&
        (() => {
          const dist = (l: ConfluenceLevel) => Math.abs(l.price - price);
          const supAll = plan.levels
            .filter((l) => l.price < price)
            .sort((a, b) => dist(a) - dist(b));
          const resAll = plan.levels
            .filter((l) => l.price > price)
            .sort((a, b) => dist(a) - dist(b));
          // Only the 3 closest levels on each side — the actionable ones.
          const sup = supAll.slice(0, 3);
          const res = resAll.slice(0, 3);
          const maxStr = Math.max(...plan.levels.map((l) => l.strength));
          const row = (l: ConfluenceLevel, side: "res" | "sup", tag?: string) => {
            const gap = ((l.price - price) / price) * 100;
            const color = side === "res" ? LOSS : GAIN;
            return (
              <div
                key={l.price}
                className="d-flex justify-content-between align-items-center py-1"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="d-flex align-items-center gap-1">
                  {tag && (
                    <span
                      style={{
                        fontSize: "0.54rem",
                        fontWeight: 700,
                        color: "#04121c",
                        background: color,
                        borderRadius: 4,
                        padding: "1px 4px",
                      }}
                    >
                      {tag}
                    </span>
                  )}
                  <span
                    className="mono"
                    style={{ color, fontSize: "0.74rem", fontWeight: l.strength === maxStr ? 700 : 400 }}
                  >
                    {rup(l.price)}
                    {l.strength === maxStr && (
                      <span style={{ color: "#f0b90b", marginLeft: 3 }}>◆</span>
                    )}
                  </span>
                </span>
                <span className="muted-text" style={{ fontSize: "0.62rem" }}>
                  {l.strength}t {gap >= 0 ? "▲" : "▼"} {Math.abs(gap).toFixed(1)}%
                </span>
              </div>
            );
          };
          return (
            <div className="mt-2">
              <div className="muted-text mb-1" style={{ fontSize: "0.68rem" }}>
                Key levels · vs ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <div className="mb-2">
                <div className="fw-semibold mb-1" style={{ color: LOSS, fontSize: "0.66rem" }}>
                  RESISTANCE · targets
                </div>
                {res.length ? (
                  res.map((l, i) => row(l, "res", i === 0 ? "TARGET" : undefined))
                ) : (
                  <span className="muted-text small">none above</span>
                )}
              </div>
              <div>
                <div className="fw-semibold mb-1" style={{ color: GAIN, fontSize: "0.66rem" }}>
                  SUPPORT · buy zones
                </div>
                {sup.length ? (
                  sup.map((l, i) => row(l, "sup", i === 0 ? "ENTRY" : undefined))
                ) : (
                  <span className="muted-text small">none below</span>
                )}
              </div>
            </div>
          );
        })()}
      <div className="muted-text mt-2" style={{ fontSize: "0.62rem" }}>
        Confluence of pivot / round / Fib / MA / VWAP / volume-profile. Not
        investment advice.
      </div>
    </div>
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
      fetchJson<any>(`/api/technical?symbol=${encodeURIComponent(symbol)}`)
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

      {fetched.confluence && (
        <TradePlan plan={fetched.confluence} price={fetched.price} />
      )}
    </div>
  );
}
