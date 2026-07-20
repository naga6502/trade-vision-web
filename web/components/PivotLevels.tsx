"use client";

import { useEffect, useRef, useState } from "react";
import type { PriceBar } from "@/lib/marketData";
import { fetchJson } from "@/lib/fetchJson";

const UP = "#16c784";
const DOWN = "#ea3943";
const PRICE = "#38bdf8";
const AMBER = "#f0b90b";
const AXIS = "#8b93a7";

const rup = (x: number) => "₹" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });

type Key = "R3" | "R2" | "R1" | "PP" | "S1" | "S2" | "S3";
// Fixed order: resistance above the pivot point, support below it.
const ORDER: Key[] = ["R3", "R2", "R1", "PP", "S1", "S2", "S3"];

const META: Record<Key, { side: "res" | "sup" | "pivot"; color: string }> = {
  R3: { side: "res", color: "#ea3943" },
  R2: { side: "res", color: "#f0666f" },
  R1: { side: "res", color: "#ff8a93" },
  PP: { side: "pivot", color: AMBER },
  S1: { side: "sup", color: "#5fd6a0" },
  S2: { side: "sup", color: "#2fae74" },
  S3: { side: "sup", color: UP },
};

interface Pivots {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

// Classic floor pivots from the most recent COMPLETED daily session (excludes
// today's still-forming bar so the levels stay stable through the session).
function computePivots(bars: PriceBar[]): { piv: Pivots; date: string } | null {
  if (!bars || bars.length < 2) return null;
  const istToday = (() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 5.5 * 3600000).toISOString().slice(0, 10);
  })();
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  let idx = sorted.length - 1;
  if (sorted[idx].date >= istToday) idx -= 1; // skip today's forming bar
  const bar = sorted[Math.max(0, idx)];
  const H = bar.high;
  const L = bar.low;
  const C = bar.close;
  const pp = (H + L + C) / 3;
  return {
    piv: {
      pp,
      r1: 2 * pp - L,
      s1: 2 * pp - H,
      r2: pp + (H - L),
      s2: pp - (H - L),
      r3: H + 2 * (pp - L),
      s3: L - 2 * (pp - H),
    },
    date: bar.date,
  };
}

export default function PivotLevels({
  symbol,
  livePrice,
}: {
  symbol: string;
  livePrice?: number | null;
}) {
  const [piv, setPiv] = useState<Pivots | null>(null);
  const [srcDate, setSrcDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchJson(`/api/price-history?symbol=${encodeURIComponent(symbol)}&range=1M`)
      .then((j: any) => {
        if (cancelled) return;
        const computed = computePivots(j?.bars ?? []);
        if (!computed) {
          setErr("Not enough price history");
          setPiv(null);
        } else {
          setPiv(computed.piv);
          setSrcDate(computed.date);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Track direction of motion for the "moving toward" hint.
  const prevRef = useRef<number | null>(null);
  const [pulseId, setPulseId] = useState(0);
  const price =
    typeof livePrice === "number" && Number.isFinite(livePrice) ? livePrice : null;
  const dir = prevRef.current == null || price == null ? 0 : price > prevRef.current ? 1 : price < prevRef.current ? -1 : 0;
  useEffect(() => {
    prevRef.current = price;
    setPulseId((n) => n + 1);
  }, [price]);

  if (loading) {
    return (
      <div className="text-center text-muted py-4">
        <span className="spinner-border spinner-border-sm me-2" /> Loading pivots…
      </div>
    );
  }
  if (err || !piv) {
    return <div className="muted-text small py-3">{err ?? "No pivot data."}</div>;
  }

  const vals: Record<Key, number> = {
    R3: piv.r3,
    R2: piv.r2,
    R1: piv.r1,
    PP: piv.pp,
    S1: piv.s1,
    S2: piv.s2,
    S3: piv.s3,
  };
  const ref = price ?? piv.pp;

  // nearest level + next S/R in the direction of motion
  let nearest: Key = "PP";
  let nearestD = Infinity;
  for (const k of ORDER) {
    const d = Math.abs(vals[k] - ref);
    if (d < nearestD) {
      nearestD = d;
      nearest = k;
    }
  }
  const resistAbove = ORDER.filter((k) => META[k].side === "res" && vals[k] > ref);
  const suppBelow = ORDER.filter((k) => META[k].side === "sup" && vals[k] < ref);
  const nextRes = resistAbove.length ? resistAbove[resistAbove.length - 1] : null;
  const nextSup = suppBelow.length ? suppBelow[0] : null;

  const abovePP = ref > piv.pp;

  // ---- horizontal position meter (S3 → R3) -------------------------------
  const s3 = piv.s3;
  const r3 = piv.r3;
  const range = r3 - s3 || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - s3) / range) * 100));
  const ppPos = pct(piv.pp);
  const s1Pos = pct(piv.s1);
  const r1Pos = pct(piv.r1);
  const pricePos = price != null ? pct(price) : ppPos;
  const dotColor = abovePP ? UP : DOWN;
  const grad = `linear-gradient(90deg, ${UP} 0%, #2fae74 ${s1Pos}%, ${AMBER} ${ppPos}%, #f0666f ${r1Pos}%, ${DOWN} 100%)`;
  let hint = "";
  let hintColor = AXIS;
  if (price != null && dir !== 0) {
    const target = dir > 0 ? nextRes : nextSup;
    if (target) {
      const gap = (Math.abs(vals[target] - price) / price) * 100;
      hint = `${dir > 0 ? "↗" : "↘"} ${abovePP ? "Above Pivot" : "Below Pivot"} · approaching ${target} · ${gap.toFixed(1)}% away`;
      hintColor = META[target].color;
    } else {
      hint = dir > 0 ? "↗ Breaking above R3" : "↘ Breaking below S3";
      hintColor = dir > 0 ? DOWN : UP;
    }
  } else {
    hint = `Holding ${abovePP ? "above" : "below"} Pivot · near ${nearest}`;
    hintColor = META[nearest].color;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <span className="muted-text" style={{ fontSize: "0.72rem" }}>
          Classic floor pivots · prev session {srcDate ?? ""}
        </span>
        <span
          className="pill"
          style={{ fontSize: "0.66rem", borderColor: abovePP ? UP : DOWN, color: abovePP ? UP : DOWN }}
        >
          {abovePP ? "Above Pivot · bullish" : "Below Pivot · bearish"}
        </span>
      </div>

      {/* fixed vertical ladder: R3..R1 above PP, S1..S3 below */}
      <div className="d-flex flex-column" style={{ gap: 2 }}>
        {ORDER.map((k) => {
          const isPP = k === "PP";
          const isNearest = k === nearest && price != null;
          const gap = price != null ? ((vals[k] - price) / price) * 100 : 0;
          const above = vals[k] > ref;
          return (
            <div
              key={k}
              className="d-flex align-items-center gap-2"
              style={{
                padding: isPP ? "6px 8px" : "4px 8px",
                borderRadius: 6,
                background: isPP ? `${AMBER}14` : isNearest ? `${META[k].color}12` : "transparent",
                border: isPP ? `1px solid ${AMBER}40` : isNearest ? `1px solid ${META[k].color}33` : "1px solid transparent",
              }}
            >
              <span
                style={{
                  minWidth: 30,
                  textAlign: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: META[k].color,
                }}
              >
                {k}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.7 }} />
              <div className="text-end" style={{ minWidth: 120 }}>
                <div className="mono" style={{ color: "var(--ink)", fontSize: isPP ? "0.92rem" : "0.82rem", fontWeight: isPP ? 700 : 600 }}>
                  {rup(vals[k])}
                </div>
                {price != null && (
                  <div className="mono" style={{ fontSize: "0.64rem", color: gap === 0 ? AXIS : above ? DOWN : UP }}>
                    {above ? "▲" : "▼"} {Math.abs(gap).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* position meter: where price sits between S3 and R3 */}
      <div className="mt-3">
        <div className="muted-text mb-1" style={{ fontSize: "0.64rem", letterSpacing: "0.04em" }}>
          POSITION · S3 → R3
        </div>
        <div style={{ position: "relative", height: 52 }}>
          {/* track */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 0,
              right: 0,
              height: 10,
              borderRadius: 6,
              background: grad,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.45)",
            }}
          />
          {/* level ticks */}
          {ORDER.map((k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                top: 12,
                left: `${pct(vals[k])}%`,
                transform: "translateX(-50%)",
                width: 1,
                height: 22,
                background: k === "PP" ? AMBER : "var(--border)",
                opacity: k === "PP" ? 1 : 0.8,
              }}
            />
          ))}
          {/* moving price dot */}
          <div
            style={{
              position: "absolute",
              top: 23,
              left: `${pricePos}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 0.6s ease",
            }}
          >
            <div style={{ position: "relative", width: 14, height: 14 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: dotColor,
                  border: "2px solid #0b0e14",
                  boxShadow: `0 0 8px ${dotColor}`,
                }}
              />
              {/* pulse ring — replays on each price update via key */}
              {price != null && (
                <span
                  key={pulseId}
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: `2px solid ${dotColor}`,
                    animation: "pivotPulse 0.7s ease-out",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                background: dotColor,
                color: "#04121c",
                fontSize: "0.62rem",
                fontWeight: 700,
                borderRadius: 5,
                padding: "1px 5px",
              }}
            >
              {dir > 0 ? "↗" : dir < 0 ? "↘" : "•"} {price != null ? rup(price) : "—"}
            </div>
          </div>
          {/* endpoint + PP labels */}
          <span className="mono" style={{ position: "absolute", top: 36, left: 0, fontSize: "0.6rem", color: UP }}>
            S3
          </span>
          <span
            className="mono"
            style={{ position: "absolute", top: 36, left: `${ppPos}%`, transform: "translateX(-50%)", fontSize: "0.6rem", color: AMBER }}
          >
            PP
          </span>
          <span className="mono" style={{ position: "absolute", top: 36, right: 0, fontSize: "0.6rem", color: DOWN }}>
            R3
          </span>
        </div>
      </div>

      {/* live price + motion hint */}
      <div
        className="mt-2"
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${hintColor}40`,
          background: `${hintColor}12`,
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <span className="muted-text" style={{ fontSize: "0.68rem", letterSpacing: "0.04em" }}>
            LIVE PRICE
          </span>
          <span className="mono" style={{ fontWeight: 700, color: PRICE, fontSize: "0.92rem" }}>
            {price != null ? rup(price) : "—"}
          </span>
        </div>
        <div className="small fw-semibold mt-1" style={{ color: hintColor }}>
          {hint}
        </div>
      </div>
    </div>
  );
}
