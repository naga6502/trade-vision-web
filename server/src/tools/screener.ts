import {
  fetchBars,
  sma,
  ema,
  rsi,
  adx,
  atr,
  bollingerWidth,
  detectCandlePatterns,
  type RawBar,
} from "./technical.js";

export type ScreenerType =
  | "momentum"
  | "breakout"
  | "intraday"
  | "swing"
  | "mean-reversion"
  | "volatility"
  | "sector-rotation"
  | "accumulation"
  | "all";

export interface ScreenerRule {
  name: ScreenerType | string;
  description: string;
  scoreWeight: number;
  conditions: string[];
}

export interface ScreenerIndicators {
  rsi?: number;
  adx?: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
  atr?: number;
  bbWidth?: number;
  volumeAvg?: number;
  volumeCurrent?: number;
  volRatio?: number;
}

export interface ScreenerResult {
  symbol: string;
  name?: string; // live company name (enriched by the API layer, not the engine)
  screenName: string;
  score: number; // 0-100
  reason: string;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  momentum: "STRONG" | "WEAK" | "NEUTRAL";
  volume: "HIGH" | "NORMAL" | "LOW";
  risk: "LOW" | "MEDIUM" | "HIGH";
  price: number;
  changePct: number;
  indicators: ScreenerIndicators;
  pattern: string;
}

export interface ScreenerScreen {
  name: string;
  description: string;
  scoreWeight: number;
  results: ScreenerResult[];
}

export interface ScreenerOutput {
  requested: ScreenerType | "all";
  screens: ScreenerScreen[];
  universeSize: number;
  generatedAt: string;
}

export interface ScreenerArgs {
  screenType?: ScreenerType;
  symbols?: string[];
  limit?: number;
  sector?: string;
  minVolume?: number;
}

// ---------------------------------------------------------------------------
// Screen catalog. `conditions` is documentation surfaced by get_stock_screener's
// registry; the real scoring lives in the `evaluators` map below.
// ---------------------------------------------------------------------------
const screenerRegistry: ScreenerRule[] = [
  {
    name: "momentum",
    description: "Trend-following names with EMA alignment and strong momentum",
    scoreWeight: 35,
    conditions: [
      "Price above 20-day EMA",
      "20-day EMA above 50-day EMA",
      "RSI above 55",
      "ADX above 20",
      "Volume above 1.2x average",
    ],
  },
  {
    name: "breakout",
    description: "Stocks breaking out of consolidation with volume confirmation",
    scoreWeight: 30,
    conditions: [
      "Close above recent 20-day high",
      "Volume above 1.5x average",
      "Price acceptance above prior resistance",
    ],
  },
  {
    name: "intraday",
    description: "Session intraday breakout: price above VWAP and the opening-range high on volume",
    scoreWeight: 30,
    conditions: [
      "Price above the 15-minute VWAP",
      "Breakout above the opening-range (first 30m) high",
      "Volume spike above 1.4x average",
      "RSI above 55 and rising",
    ],
  },
  {
    name: "swing",
    description: "Pullback-based swing setups in a healthy uptrend",
    scoreWeight: 25,
    conditions: [
      "Price above 50-day EMA",
      "Pullback to 20-day or 50-day EMA",
      "Bullish reversal candle",
    ],
  },
  {
    name: "mean-reversion",
    description: "Short-term bounce from oversold or support zones",
    scoreWeight: 24,
    conditions: [
      "RSI below 35",
      "Price near support or 200-day EMA",
      "Bounce confirmation candle",
    ],
  },
  {
    name: "volatility",
    description: "Volatility expansion setups with widening bands",
    scoreWeight: 26,
    conditions: [
      "ATR rising sharply",
      "Bollinger width expanding",
      "Price outside a narrow range",
    ],
  },
  {
    name: "sector-rotation",
    description: "Relative-strength leadership: outperformance on rising volume",
    scoreWeight: 22,
    conditions: [
      "20-day return positive and leading",
      "Price above 50-day EMA",
      "ADX confirming with +DI > -DI",
      "Volume above 1.2x average",
    ],
  },
  {
    name: "accumulation",
    description: "Institutional-style accumulation with rising price and volume",
    scoreWeight: 22,
    conditions: [
      "Rising price with rising volume",
      "Accumulation day (up close, above-average volume)",
      "Relative volume above average",
    ],
  },
];

export function getScreenerRegistry(): ScreenerRule[] {
  return screenerRegistry;
}

// ---------------------------------------------------------------------------
// Per-symbol metrics. Computed once per symbol from ~1y of daily bars; all
// screens are evaluated from this single structure so we only fetch once.
// ---------------------------------------------------------------------------
interface Metrics {
  symbol: string;
  price: number;
  prevClose: number;
  changePct: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  atr: number;
  atrPrev: number;
  bbWidth: number;
  bbWidthPrev: number;
  volAvg20: number;
  volCurrent: number;
  volRatio: number;
  volAvgLast5: number;
  volAvgPrev5: number;
  high20: number;
  low20: number;
  high50: number;
  low50: number;
  ret20: number;
  close5ago: number;
  lastHigh: number;
  lastLow: number;
  rangePos: number;
  lastBullish: boolean;
  bullishReversal: boolean;
  patterns: string[];
}

const METRICS_TTL_MS = 60_000;
const metricsCache = new Map<string, { at: number; m: Metrics | null }>();

function pct(a: number, b: number): number {
  return b && Number.isFinite(b) ? (a / b - 1) * 100 : 0;
}

function round2(n: number): number | undefined {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

async function computeMetrics(symbolRaw: string): Promise<Metrics | null> {
  const raw = (symbolRaw ?? "").trim().toUpperCase();
  if (!raw) return null;
  const ticker = /\.[A-Z]{1,3}$/.test(raw) ? raw : `${raw}.NS`;
  const cached = metricsCache.get(ticker);
  if (cached && Date.now() - cached.at < METRICS_TTL_MS) return cached.m;

  const bars: RawBar[] = await fetchBars(ticker, "1d", 400).catch(() => []);
  let m: Metrics | null = null;
  if (bars.length >= 60) {
    const closes = bars.map((b) => b.close);
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const vols = bars.map((b) => b.volume);
    const n = closes.length;
    const price = closes[n - 1];
    const prevClose = closes[n - 2] ?? price;

    const ema20 = ema(closes, 20);
    const ema50 = ema(closes, 50);
    const ema200 = ema(closes, 200);
    const rsiV = rsi(closes);
    const adxV = adx(highs, lows, closes);
    const atrV = atr(highs, lows, closes);
    const bbWidth = bollingerWidth(closes);

    const prevSlice = closes.slice(0, n - 20);
    const atrPrev = prevSlice.length >= 14
      ? atr(highs.slice(0, n - 20), lows.slice(0, n - 20), prevSlice)
      : NaN;
    const bbWidthPrev = prevSlice.length >= 20 ? bollingerWidth(prevSlice) : NaN;

    const v20 = vols.slice(-20);
    const volAvg20 = v20.reduce((a, b) => a + b, 0) / v20.length;
    const volCurrent = vols[n - 1] ?? 0;
    const volRatio = volAvg20 ? volCurrent / volAvg20 : 1;
    const vLast5 = vols.slice(-5);
    const vPrev5 = vols.slice(-10, -5);
    const volAvgLast5 = vLast5.reduce((a, b) => a + b, 0) / Math.max(1, vLast5.length);
    const volAvgPrev5 = vPrev5.length
      ? vPrev5.reduce((a, b) => a + b, 0) / vPrev5.length
      : volAvgLast5;

    const high20 = Math.max(...highs.slice(-20));
    const low20 = Math.min(...lows.slice(-20));
    const high50 = Math.max(...highs.slice(-50));
    const low50 = Math.min(...lows.slice(-50));
    const close20ago = closes[n - 21] ?? closes[0];
    const close5ago = closes[n - 6] ?? closes[0];

    const last = bars[n - 1];
    const rangePos =
      last.high > last.low
        ? ((last.close - last.low) / (last.high - last.low)) * 100
        : 50;

    const candlePats = detectCandlePatterns(bars.slice(-3), {}).filter(
      (p) => p.type === "BULLISH",
    );

    m = {
      symbol: ticker,
      price,
      prevClose,
      changePct: pct(price, prevClose),
      ema20,
      ema50,
      ema200,
      rsi: rsiV,
      adx: adxV.adx,
      plusDI: adxV.plusDI,
      minusDI: adxV.minusDI,
      atr: atrV,
      atrPrev,
      bbWidth,
      bbWidthPrev,
      volAvg20,
      volCurrent,
      volRatio,
      volAvgLast5,
      volAvgPrev5,
      high20,
      low20,
      high50,
      low50,
      ret20: pct(price, close20ago),
      close5ago,
      lastHigh: last.high,
      lastLow: last.low,
      rangePos,
      lastBullish: last.close > last.open,
      bullishReversal: candlePats.length > 0,
      patterns: candlePats.map((p) => p.name),
    };
  }

  metricsCache.set(ticker, { at: Date.now(), m });
  return m;
}

// ---------------------------------------------------------------------------
// Screen evaluation. Each returns null when the symbol simply isn't a candidate
// for that style (so weak names drop out instead of scoring near zero).
// ---------------------------------------------------------------------------
type Trend = "UP" | "DOWN" | "SIDEWAYS";
type Mom = "STRONG" | "WEAK" | "NEUTRAL";
type Vol = "HIGH" | "NORMAL" | "LOW";
type Risk = "LOW" | "MEDIUM" | "HIGH";

interface ScreenEval {
  score: number;
  reason: string;
  trend: Trend;
  momentum: Mom;
  volume: Vol;
  risk: Risk;
  price: number;
  changePct: number;
  indicators: ScreenerIndicators;
  pattern: string;
}

function classify(m: Metrics): { trend: Trend; momentum: Mom; volume: Vol; risk: Risk } {
  const trend: Trend =
    m.price > m.ema50 && (Number.isNaN(m.ema200) || m.ema50 >= m.ema200)
      ? "UP"
      : m.price < m.ema200
        ? "DOWN"
        : "SIDEWAYS";
  const momentum: Mom = m.rsi >= 60 ? "STRONG" : m.rsi <= 40 ? "WEAK" : "NEUTRAL";
  const volume: Vol = m.volRatio >= 1.5 ? "HIGH" : m.volRatio >= 1 ? "NORMAL" : "LOW";

  let risk: Risk = "MEDIUM";
  if (m.price < m.ema200 || (m.adx < 15 && m.atr / Math.max(m.price, 1e-9) > 0.04)) {
    risk = "HIGH";
  } else if (m.price > m.ema50 && m.adx > 20) {
    risk = "LOW";
  }
  return { trend, momentum, volume, risk };
}

function buildEval(m: Metrics, opts: {
  base: number;
  reason: string[];
  pattern?: string;
}): ScreenEval {
  const c = classify(m);
  return {
    score: Math.max(0, Math.min(100, Math.round(opts.base))),
    reason: opts.reason.join(" · ") || "No clear signal",
    trend: c.trend,
    momentum: c.momentum,
    volume: c.volume,
    risk: c.risk,
    price: m.price,
    changePct: m.changePct,
    indicators: {
      rsi: round2(m.rsi),
      adx: round2(m.adx),
      ema20: round2(m.ema20),
      ema50: round2(m.ema50),
      ema200: round2(m.ema200),
      atr: round2(m.atr),
      bbWidth: round2(m.bbWidth),
      volumeAvg: Math.round(m.volAvg20),
      volumeCurrent: Math.round(m.volCurrent),
      volRatio: round2(m.volRatio),
    },
    pattern: opts.pattern ?? m.patterns[0] ?? "—",
  };
}

const evaluators: Record<string, (m: Metrics) => ScreenEval | null> = {
  momentum(m) {
    if (!Number.isFinite(m.ema20) || !Number.isFinite(m.ema50)) return null;
    const reasons: string[] = [];
    let s = 0;
    if (m.price > m.ema20) { s += 12; reasons.push("price > EMA20"); }
    if (m.ema20 > m.ema50) { s += 12; reasons.push("EMA20 > EMA50"); }
    if (Number.isFinite(m.ema200) && m.ema50 > m.ema200) { s += 8; reasons.push("EMA50 > EMA200"); }
    if (m.rsi >= 55) { s += 10; reasons.push(`RSI ${m.rsi.toFixed(0)}`); }
    else if (m.rsi >= 50) s += 5;
    if (Number.isFinite(m.adx) && m.adx > 20 && m.plusDI > m.minusDI) {
      s += 12; reasons.push(`ADX ${m.adx.toFixed(0)}`);
    }
    if (m.volRatio >= 1.2) { s += 8; reasons.push(`vol ${m.volRatio.toFixed(1)}x`); }
    if (m.changePct > 0) s += 6;
    if (s < 30) return null;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },

  breakout(m) {
    if (!Number.isFinite(m.ema20) || m.high20 <= 0) return null;
    const reasons: string[] = [];
    let s = 0;
    const above = m.price > m.high20;
    const near = m.price >= m.high20 * 0.985;
    if (above) { s += 35; reasons.push("new 20D high"); }
    else if (near) { s += 22; reasons.push(`${pct(m.price, m.high20).toFixed(1)}% to 20D high`); }
    else return null;
    if (m.volRatio >= 1.5) { s += 28; reasons.push(`vol ${m.volRatio.toFixed(1)}x`); }
    else if (m.volRatio >= 1.1) s += 12;
    if (m.price > m.ema20) s += 12;
    if (Number.isFinite(m.adx) && m.adx > 20) { s += 10; reasons.push(`ADX ${m.adx.toFixed(0)}`); }
    if (m.changePct > 0) s += 8;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },

  swing(m) {
    if (!Number.isFinite(m.ema50)) return null;
    const reasons: string[] = [];
    let s = 0;
    if (m.price > m.ema50) { s += 12; reasons.push("above EMA50 (uptrend)"); }
    if (Number.isFinite(m.ema200) && m.price > m.ema200) s += 6;
    const inZone = m.price <= m.ema20 * 1.03 && m.price >= m.ema50 * 0.98;
    if (inZone) { s += 30; reasons.push("pulled back to MAs"); }
    else if (m.price <= m.ema20 * 1.06) s += 12;
    else return null;
    if (m.bullishReversal) { s += 25; reasons.push(`reversal: ${m.patterns[0]}`); }
    if (m.volRatio >= 1) s += 12;
    if (m.changePct > -1 && m.changePct < 4) s += 10;
    if (s < 35) return null;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },

  "mean-reversion"(m) {
    const reasons: string[] = [];
    let s = 0;
    if (m.rsi <= 35) { s += 35; reasons.push(`RSI ${m.rsi.toFixed(0)} oversold`); }
    else if (m.rsi <= 42) { s += 18; reasons.push(`RSI ${m.rsi.toFixed(0)}`); }
    else return null;
    const near200 = Number.isFinite(m.ema200) && Math.abs(pct(m.price, m.ema200)) <= 6;
    const nearLow = m.low20 > 0 && m.price <= m.low20 * 1.05;
    if (near200) { s += 18; reasons.push("near 200EMA support"); }
    if (nearLow) { s += 14; reasons.push("near 20D low"); }
    if (m.lastBullish) { s += 18; reasons.push("bounce candle"); }
    else if (m.changePct < -3) return null;
    if (m.volRatio >= 0.9) s += 10;
    if (m.changePct > -1.5) s += 5;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },

  volatility(m) {
    const reasons: string[] = [];
    let s = 0;
    const bbExp = Number.isFinite(m.bbWidthPrev) && m.bbWidth > m.bbWidthPrev * 1.05;
    const atrExp = Number.isFinite(m.atrPrev) && m.atr > m.atrPrev * 1.05;
    if (bbExp) { s += 35; reasons.push("Bollinger widening"); }
    if (atrExp) { s += 30; reasons.push("ATR rising"); }
    if (!bbExp && !atrExp) return null;
    const outside = m.price >= m.high20 * 0.98 || m.price <= m.low20 * 1.02;
    if (outside) s += 15;
    if (m.volRatio >= 1.3) { s += 15; reasons.push(`vol ${m.volRatio.toFixed(1)}x`); }
    else if (m.volRatio >= 1) s += 6;
    if (s < 35) return null;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },

  accumulation(m) {
    const reasons: string[] = [];
    let s = 0;
    if (m.price > m.ema20) s += 10;
    if (m.price > m.close5ago) { s += 20; reasons.push("rising price"); }
    if (m.volAvgLast5 > m.volAvgPrev5 * 1.05) { s += 30; reasons.push("volume expanding"); }
    else if (m.volAvgLast5 > m.volAvgPrev5) s += 12;
    if (m.lastBullish && m.volCurrent >= m.volAvg20) { s += 25; reasons.push("accumulation day"); }
    if (m.volRatio >= 1) s += 15;
    if (s < 35) return null;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },

  "sector-rotation"(m) {
    const reasons: string[] = [];
    let s = 0;
    if (m.ret20 >= 5) { s += 25; reasons.push(`${m.ret20.toFixed(1)}% / 20D`); }
    else if (m.ret20 >= 0) s += 10;
    else return null;
    if (m.price > m.ema50) { s += 15; reasons.push("above EMA50"); }
    if (m.rsi >= 50) s += 10;
    if (Number.isFinite(m.adx) && m.adx > 20 && m.plusDI > m.minusDI) {
      s += 20; reasons.push(`ADX ${m.adx.toFixed(0)} leadership`);
    }
    if (m.volRatio >= 1.2) { s += 15; reasons.push(`vol ${m.volRatio.toFixed(1)}x`); }
    if (Number.isNaN(m.ema200) || m.ema50 >= m.ema200) s += 15;
    if (s < 35) return null;
    return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
  },
};

// Build a ScreenerResult from a per-symbol evaluation.
function toResult(m: Metrics, screenName: string, e: ScreenEval): ScreenerResult {
  return {
    symbol: m.symbol,
    screenName,
    score: e.score,
    reason: e.reason,
    trend: e.trend,
    momentum: e.momentum,
    volume: e.volume,
    risk: e.risk,
    price: e.price,
    changePct: e.changePct,
    indicators: e.indicators,
    pattern: e.pattern,
  } satisfies ScreenerResult;
}

// ---------------------------------------------------------------------------
// Intraday screen: real 15-minute VWAP + opening-range (first 30m) high.
// We only pay for a 15m fetch on the names that already clear the cheap
// daily pre-filter, so a full universe sweep doesn't double its Yahoo calls.
// ---------------------------------------------------------------------------
interface IntradayMetrics {
  vwap: number;
  orbHigh: number;
  orbLow: number;
}

// Cheap daily check: is this name worth a 15m fetch at all?
function dailyIntradayQualifies(m: Metrics): boolean {
  if (!Number.isFinite(m.ema20)) return false;
  if (m.rangePos < 55) return false;
  if (m.rsi < 45) return false;
  if (m.price <= m.ema20) return false;
  if (m.volRatio < 1) return false;
  return true;
}

async function computeIntradayMetrics(symbolRaw: string): Promise<IntradayMetrics | null> {
  const raw = (symbolRaw ?? "").trim().toUpperCase();
  if (!raw) return null;
  const ticker = /\.[A-Z]{1,3}$/.test(raw) ? raw : `${raw}.NS`;
  const bars = await fetchBars(ticker, "15m", 1).catch(() => []);
  const valid = bars.filter((b) => Number.isFinite(b.high) && b.high > 0);
  if (valid.length < 2) return null;

  // Opening range = first two 15m bars (first 30 minutes of the session).
  const orbHigh = Math.max(valid[0].high, valid[1].high);
  const orbLow = Math.min(valid[0].low, valid[1].low);

  // VWAP from typical price (H+L+C)/3 weighted by volume.
  let pv = 0;
  let vol = 0;
  for (const b of valid) {
    const tp = (b.high + b.low + b.close) / 3;
    const v = b.volume ?? 0;
    pv += tp * v;
    vol += v;
  }
  const vwap = vol ? pv / vol : valid[valid.length - 1].close;
  return { vwap, orbHigh, orbLow };
}

function evaluateIntraday(m: Metrics, im: IntradayMetrics): ScreenEval | null {
  const reasons: string[] = [];
  let s = 0;
  const aboveOrb = m.price > im.orbHigh;
  const aboveVwap = m.price > im.vwap;
  if (aboveOrb) { s += 35; reasons.push(`above ORB high ${im.orbHigh.toFixed(1)}`); }
  else if (aboveVwap) { s += 18; reasons.push("above VWAP"); }
  else return null; // below both: no intraday long setup
  if (m.volRatio >= 1.4) { s += 25; reasons.push(`vol ${m.volRatio.toFixed(1)}x`); }
  else if (m.volRatio >= 1) s += 10;
  if (m.rsi >= 55) { s += 12; reasons.push(`RSI ${m.rsi.toFixed(0)}`); }
  else if (m.rsi < 45) return null;
  if (m.lastBullish) s += 12;
  if (m.changePct > 0) s += 8;
  if (m.price > im.orbHigh * 1.02) s -= 5; // too extended from the breakout
  if (s < 35) return null;
  return buildEval(m, { base: s, reason: reasons, pattern: m.patterns[0] });
}

async function evalIntradayScreen(metrics: Metrics[], limit: number): Promise<{ name: string; description: string; scoreWeight: number; results: ScreenerResult[] }> {
  const def = screenerRegistry.find((d) => d.name === "intraday")!;
  const candidates = metrics.filter(dailyIntradayQualifies);
  if (candidates.length === 0) {
    return { name: def.name, description: def.description, scoreWeight: def.scoreWeight, results: [] };
  }
  const ims = await pool(candidates, 6, (m) => computeIntradayMetrics(m.symbol));
  const results: ScreenerResult[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const im = ims[i];
    const e = im ? evaluateIntraday(candidates[i], im) : null;
    if (!e) continue;
    results.push(toResult(candidates[i], def.name, e));
  }
  results.sort((a, b) => b.score - a.score);
  return { name: def.name, description: def.description, scoreWeight: def.scoreWeight, results: results.slice(0, limit) };
}

// ---------------------------------------------------------------------------
// Concurrency-limited runner so we don't hammer Yahoo with one fetch per symbol.
// ---------------------------------------------------------------------------
async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => {
    let idx = i++;
    while (idx < items.length) {
      out[idx] = await fn(items[idx]);
      idx = i++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

function normalizeSymbol(s: string): string {
  return s.replace(/\.(NS|BO)$/, "").toUpperCase();
}

export async function runScreener(args: ScreenerArgs): Promise<ScreenerOutput> {
  const limit = args.limit ?? 10;
  const screenName: ScreenerType | "all" = args.screenType ?? "all";
  const minVolume = args.minVolume ?? 0;
  const symbols = (args.symbols ?? [])
    .map(normalizeSymbol)
    .filter((s, i, a) => s && a.indexOf(s) === i);

  const metricsList = await pool(symbols, 6, (sym) => computeMetrics(sym));
  const valid = metricsList.filter((m): m is Metrics => m !== null);
  const filtered = minVolume > 0 ? valid.filter((m) => m.volAvg20 >= minVolume) : valid;

  // Intraday is evaluated separately (real 15m VWAP / opening range),
  // so it is excluded from the generic registry loop below.
  const screens: ScreenerScreen[] = screenerRegistry
    .filter((def) => def.name !== "intraday")
    .map((def) => {
      const evalFn = evaluators[def.name];
      const results: ScreenerResult[] = evalFn
        ? filtered
            .map((m) => {
              const e = evalFn(m);
              return e ? toResult(m, def.name, e) : null;
            })
            .filter((r): r is ScreenerResult => r !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
        : [];

      return {
        name: def.name,
        description: def.description,
        scoreWeight: def.scoreWeight,
        results,
      };
    });

  screens.push(await evalIntradayScreen(filtered, limit));

  const selected =
    screenName !== "all" ? screens.filter((s) => s.name === screenName) : screens;

  return {
    requested: screenName,
    screens: selected.length ? selected : screens,
    universeSize: symbols.length,
    generatedAt: new Date().toISOString(),
  };
}
