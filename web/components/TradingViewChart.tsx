"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type MouseEventParams,
} from "lightweight-charts";
import { fetchJson } from "@/lib/fetchJson";

const RANGES = ["1W", "1M", "3M", "6M", "1Y"];

// Palette mirrors globals.css tokens so the chart blends into the terminal.
const GAIN = "#16c784";
const LOSS = "#f6465d";
const AXIS = "#8a93a6";
const GRID = "rgba(255,255,255,0.045)";
const BORDER = "rgba(255,255,255,0.08)";
const BG = "#0d1320";
const SMA20 = "#f0b90b";
const SMA50 = "#4d8df0";
const EMA200 = "#b07cf0";
const BB = "#7d8db0";

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ---- indicator math (client-side, aligned to the bar array) ----------------
function rollingSMA(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}
function rollingEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (i === period - 1) {
      let s = 0;
      for (let j = 0; j <= i; j++) s += closes[j];
      prev = s / period;
    } else {
      prev = closes[i] * k + prev! * (1 - k);
    }
    out.push(prev);
  }
  return out;
}
function rollingStd(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let mean = 0;
    for (let j = i - period + 1; j <= i; j++) mean += closes[j];
    mean /= period;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) v += (closes[j] - mean) ** 2;
    out.push(Math.sqrt(v / period));
  }
  return out;
}

function fmtPrice(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "—" : n.toFixed(2);
}
function fmtVol(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e7) return (n / 1e7).toFixed(2) + "Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + "L";
  return Math.round(n).toLocaleString("en-IN");
}

function legendHtml(bar: Bar, prevClose: number | null, symbol: string): string {
  const up = bar.close >= bar.open;
  const chg =
    prevClose && prevClose !== 0 ? ((bar.close - prevClose) / prevClose) * 100 : 0;
  const chgColor = chg >= 0 ? GAIN : LOSS;
  return (
    `<span class="tv-sym">${symbol}</span>` +
    `<span class="tv-last" style="color:${up ? GAIN : LOSS}">${fmtPrice(bar.close)}</span>` +
    `<span class="tv-chg" style="color:${chgColor}">${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%</span>` +
    `<span class="tv-ohlc">O <b>${fmtPrice(bar.open)}</b> H <b>${fmtPrice(bar.high)}</b> ` +
    `L <b>${fmtPrice(bar.low)}</b> C <b>${fmtPrice(bar.close)}</b></span>` +
    `<span class="tv-vol">Vol <b>${fmtVol(bar.volume)}</b></span>`
  );
}

function TradingViewChart({
  symbol,
  height = 480,
}: {
  symbol: string;
  height?: number;
}) {
  const [range, setRange] = useState("3M");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [meta, setMeta] = useState<{
    close: number;
    prevClose: number;
    date: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const bbURef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLRef = useRef<ISeriesApi<"Line"> | null>(null);
  const barsRef = useRef<Bar[]>([]);
  const lastBarRef = useRef<Bar | null>(null);

  // Create the chart + series once. Data is loaded separately by the effect
  // below so symbol/range changes only call setData (no re-create / flicker).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: AXIS,
        fontFamily:
          "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.25)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1a2233",
        },
        horzLine: {
          color: "rgba(255,255,255,0.25)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1a2233",
        },
      },
      rightPriceScale: { borderColor: BORDER },
      timeScale: { borderColor: BORDER, rightOffset: 4, secondsVisible: false },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: GAIN,
      downColor: LOSS,
      borderUpColor: GAIN,
      borderDownColor: LOSS,
      wickUpColor: GAIN,
      wickDownColor: LOSS,
      priceLineColor: "rgba(255,255,255,0.4)",
      priceLineStyle: 2,
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceScaleId: "vol",
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const lineOpts = {
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 2 as const,
    };
    const sma20 = chart.addSeries(LineSeries, { ...lineOpts, color: SMA20 });
    const sma50 = chart.addSeries(LineSeries, { ...lineOpts, color: SMA50 });
    const ema200 = chart.addSeries(LineSeries, { ...lineOpts, color: EMA200, lineWidth: 1 as const });
    const bbU = chart.addSeries(LineSeries, {
      ...lineOpts,
      color: BB,
      lineWidth: 1 as const,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const bbL = chart.addSeries(LineSeries, {
      ...lineOpts,
      color: BB,
      lineWidth: 1 as const,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const el = legendRef.current;
      if (!el) return;
      const hasPoint =
        param.time != null && param.point && param.point.x >= 0 && param.point.y >= 0;
      if (!hasPoint) {
        if (lastBarRef.current)
          el.innerHTML = legendHtml(
            lastBarRef.current,
            prevCloseOf(lastBarRef.current),
            symbol,
          );
        return;
      }
      const bar = barsRef.current.find((b) => b.date === (param.time as string));
      if (!bar) {
        if (lastBarRef.current)
          el.innerHTML = legendHtml(
            lastBarRef.current,
            prevCloseOf(lastBarRef.current),
            symbol,
          );
        return;
      }
      const idx = barsRef.current.indexOf(bar);
      const prev = idx > 0 ? barsRef.current[idx - 1].close : null;
      el.innerHTML = legendHtml(bar, prev, symbol);
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    sma20Ref.current = sma20;
    sma50Ref.current = sma50;
    ema200Ref.current = ema200;
    bbURef.current = bbU;
    bbLRef.current = bbL;

    // autoSize does not reliably observe the absolutely-positioned .tv-canvas,
    // so the chart can render smaller than its wrapper. Drive an explicit
    // resize from a ResizeObserver on the container to keep it filling the
    // frame at all widths.
    const ro = new ResizeObserver((entries) => {
      const el = entries[0]?.target as HTMLElement | undefined;
      if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
      chart.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
      sma20Ref.current = null;
      sma50Ref.current = null;
      ema200Ref.current = null;
      bbURef.current = null;
      bbLRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function prevCloseOf(bar: Bar): number | null {
    const idx = barsRef.current.indexOf(bar);
    return idx > 0 ? barsRef.current[idx - 1].close : null;
  }

  // Load data whenever symbol or range changes, then poll so the latest bar
  // stays live (the price-history API now serves real-time Tapetide data).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setEmpty(false);

    const load = () => {
      fetchJson(`/api/price-history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
        .then((j: any) => {
          if (cancelled) return;
          const bars: Bar[] = Array.isArray(j?.bars) ? j.bars : [];
          if (!bars.length) {
            setLoading(false);
            setEmpty(true);
            barsRef.current = [];
            lastBarRef.current = null;
            return;
          }

          const candleData = bars.map((b) => ({
            time: b.date as Time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }));
          const volData = bars.map((b) => ({
            time: b.date as Time,
            value: b.volume,
            color:
              b.close >= b.open ? "rgba(22,199,132,0.55)" : "rgba(246,70,93,0.55)",
          }));
          const closes = bars.map((b) => b.close);
          const sma20 = rollingSMA(closes, 20);
          const sma50 = rollingSMA(closes, 50);
          const ema200 = rollingEMA(closes, 200);
          const mid = rollingSMA(closes, 20);
          const sd = rollingStd(closes, 20);
          const toLine = (arr: (number | null)[]) =>
            bars
              .map((b, i) => ({ time: b.date as Time, value: arr[i] as number }))
              .filter((d) => Number.isFinite(d.value));
          const bbUpper = closes.map((_, i) =>
            mid[i] != null ? mid[i]! + 2 * (sd[i] ?? 0) : null,
          );
          const bbLower = closes.map((_, i) =>
            mid[i] != null ? mid[i]! - 2 * (sd[i] ?? 0) : null,
          );

          const chart = chartRef.current;
          if (chart) {
            candleRef.current?.setData(candleData);
            volRef.current?.setData(volData);
            sma20Ref.current?.setData(toLine(sma20));
            sma50Ref.current?.setData(toLine(sma50));
            ema200Ref.current?.setData(toLine(ema200));
            bbURef.current?.setData(toLine(bbUpper));
            bbLRef.current?.setData(toLine(bbLower));
            chart.timeScale().fitContent();
          }

          const last = bars[bars.length - 1];
          const prev = bars.length > 1 ? bars[bars.length - 2].close : last.open;
          barsRef.current = bars;
          lastBarRef.current = last;
          setMeta({ close: last.close, prevClose: prev, date: last.date });
          if (legendRef.current)
            legendRef.current.innerHTML = legendHtml(last, prev, symbol);

          setLoading(false);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setErr(e instanceof Error ? e.message : String(e));
          setLoading(false);
        });
    };

    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, range]);

  const dayChange =
    meta && meta.prevClose ? ((meta.close - meta.prevClose) / meta.prevClose) * 100 : 0;
  const dayUp = dayChange >= 0;

  return (
    <div>
      <div className="tv-toolbar">
        <div className="tv-quote">
          {meta ? (
            <>
              <span
                className="mono tv-quote-px"
                style={{ color: dayUp ? GAIN : LOSS }}
              >
                ₹{fmtPrice(meta.close)}
              </span>
              <span
                className="mono tv-quote-chg"
                style={{ color: dayUp ? GAIN : LOSS }}
              >
                {dayUp ? "▲" : "▼"} {Math.abs(dayChange).toFixed(2)}%
              </span>
              <span className="tv-quote-date muted-text">{meta.date}</span>
            </>
          ) : (
            <span className="muted-text">Price history</span>
          )}
        </div>

        <div className="seg ms-auto" role="tablist">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`seg-btn ${range === r ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="tv-chart-wrap" style={{ height }}>
        <div ref={containerRef} className="tv-canvas" />
        <div ref={legendRef} className="tv-legend" />

        {loading && (
          <div className="tv-overlay">
            <span className="spinner-border spinner-border-sm me-2" />
            <span className="muted-text">Loading chart…</span>
          </div>
        )}
        {!loading && err && (
          <div className="tv-overlay tv-overlay-err">
            <i className="bi bi-exclamation-triangle me-1" />
            <span>Chart unavailable: {err}</span>
          </div>
        )}
        {!loading && !err && empty && (
          <div className="tv-overlay">
            <span className="muted-text">No price history for this symbol.</span>
          </div>
        )}
      </div>

      <div className="tv-legend-bar">
        <span className="tv-leg" style={{ color: SMA20 }}>
          <i /> SMA 20
        </span>
        <span className="tv-leg" style={{ color: SMA50 }}>
          <i /> SMA 50
        </span>
        <span className="tv-leg" style={{ color: EMA200 }}>
          <i /> EMA 200
        </span>
        <span className="tv-leg" style={{ color: BB }}>
          <i className="dash" /> Bollinger
        </span>
      </div>
    </div>
  );
}

export default memo(TradingViewChart);
