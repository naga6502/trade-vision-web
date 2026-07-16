"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { PriceHistory } from "@/lib/marketData";

const RANGES: { key: string; label: string; range: string }[] = [
  { key: "1W", label: "1W", range: "1W" },
  { key: "1M", label: "1M", range: "1M" },
  { key: "3M", label: "3M", range: "3M" },
  { key: "6M", label: "6M", range: "6M" },
  { key: "1Y", label: "1Y", range: "1Y" },
];

const UP = "#16c784";
const DOWN = "#ea3943";
const GRID = "#2a2f3a";
const AXIS = "#8b93a7";

function fmtDate(d: string, range: string): string {
  const dt = new Date(d + "T00:00:00Z");
  if (isNaN(dt.getTime())) return d;
  const day = dt.getUTCDate();
  const mon = dt.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (range === "1W" || range === "1M") return `${day} ${mon}`;
  return `${mon} ${String(dt.getUTCFullYear()).slice(2)}`;
}

function Candle(props: any) {
  const { x, width, yAxis, payload } = props;
  if (!yAxis || !payload || typeof x !== "number" || typeof width !== "number") return null;
  const { open, close, high, low } = payload;
  const yHigh = yAxis.scale(high);
  const yLow = yAxis.scale(low);
  const yOpen = yAxis.scale(open);
  const yClose = yAxis.scale(close);
  const up = close >= open;
  const color = up ? UP : DOWN;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
  const bw = Math.max(2, width * 0.62);
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
      <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
    </g>
  );
}

function ChartTooltip({ active, payload, range }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload as any;
  const up = d.close >= d.open;
  return (
    <div
      style={{
        background: "#11151f",
        border: `1px solid ${GRID}`,
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: "0.74rem",
        color: "#e6e9ef",
      }}
    >
      <div style={{ color: AXIS, marginBottom: 4 }}>{fmtDate(d.date, range)}</div>
      <div>O <b>{d.open?.toFixed(2)}</b></div>
      <div>H <b>{d.high?.toFixed(2)}</b></div>
      <div>L <b>{d.low?.toFixed(2)}</b></div>
      <div>
        C <b style={{ color: up ? UP : DOWN }}>{d.close?.toFixed(2)}</b>
      </div>
      <div style={{ color: AXIS }}>Vol {d.volume?.toLocaleString("en-IN")}</div>
    </div>
  );
}

function ChartPanel({ symbol, height = 440 }: { symbol: string; height?: number }) {
  const [range, setRange] = useState("3M");
  const [hist, setHist] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/price-history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) {
          setErr(j.error);
          setHist(null);
        } else {
          setHist(j);
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
  }, [symbol, range]);

  const { chartData, domain, last } = useMemo(() => {
    const bars = hist?.bars ?? [];
    let ma = 0;
    const data = bars.map((b, i, arr) => {
      const start = Math.max(0, i - 19);
      const window = arr.slice(start, i + 1);
      ma = window.reduce((s, x) => s + x.close, 0) / window.length;
      return { ...b, ma20: i >= 19 ? Number(ma.toFixed(2)) : null };
    });
    let lo = Infinity;
    let hi = -Infinity;
    for (const b of bars) {
      if (b.low < lo) lo = b.low;
      if (b.high > hi) hi = b.high;
    }
    if (!isFinite(lo) || !isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    const pad = (hi - lo) * 0.06 || hi * 0.06 || 1;
    return {
      chartData: data,
      domain: [Number((lo - pad).toFixed(2)), Number((hi + pad).toFixed(2))] as [number, number],
      last: bars[bars.length - 1] ?? null,
    };
  }, [hist]);

  const mainH = Math.round(height * 0.74);
  const volH = Math.round(height * 0.26);

  return (
    <div>
      <div className="d-flex gap-1 mb-2 align-items-center">
        <span className="muted-text me-2" style={{ fontSize: "0.78rem" }}>
          {last ? (
            <>
              <span className="mono" style={{ color: last.close >= last.open ? UP : DOWN, fontWeight: 700 }}>
                ₹{last.close.toFixed(2)}
              </span>{" "}
              <span className="mono" style={{ color: AXIS }}>
                {last.date}
              </span>
            </>
          ) : (
            "Price history"
          )}
        </span>
        <div className="ms-auto d-flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={`btn btn-sm ${range === r.range ? "btn-buy" : "btn-terminal"}`}
              style={range === r.range ? undefined : { opacity: 0.85 }}
              onClick={() => setRange(r.range)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading chart…
        </div>
      )}
      {err && !loading && (
        <div className="alert alert-warning mb-0" style={{ fontSize: "0.8rem" }}>
          <i className="bi bi-exclamation-triangle me-1" /> Chart unavailable: {err}
        </div>
      )}
      {!loading && !err && chartData.length === 0 && (
        <div className="empty-note">No price history for this symbol.</div>
      )}
      {!loading && !err && chartData.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={mainH}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: AXIS }}
                tickFormatter={(d) => fmtDate(d, range)}
                interval={Math.floor(chartData.length / 6)}
                axisLine={{ stroke: GRID }}
                tickLine={false}
              />
              <YAxis
                domain={domain}
                tick={{ fontSize: 10, fill: AXIS }}
                width={56}
                axisLine={{ stroke: GRID }}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(0)}
              />
              <Tooltip content={<ChartTooltip range={range} />} cursor={{ stroke: AXIS }} />
              <Bar dataKey="high" shape={<Candle />} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="ma20"
                stroke="#f0b90b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={volH}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Bar dataKey="volume" isAnimationActive={false}>
                {chartData.map((b, i) => (
                  <Cell key={i} fill={b.close >= b.open ? "rgba(22,199,132,0.55)" : "rgba(234,57,67,0.55)"} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

export default memo(ChartPanel);
