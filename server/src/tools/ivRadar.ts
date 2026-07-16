import { getOptionChain } from "../options/optionChain.js";
import {
  validateSymbol,
  fetchDailyBars,
  annualizedVol,
} from "../quant/util.js";

// Per-stock implied-volatility analytics, computed natively from the NSE
// option chain plus Yahoo realised-vol history. No external vol API.
//
// NOTE: NSE only publishes per-strike IV, not a historic IV series, so
// `iv_rank` and `iv_percentile` are derived from the distribution of trailing
// 21-day *realised* volatility as a transparent proxy. They are labelled as
// such in the response.

export interface IvSmilePoint {
  strike: number;
  iv: number | null;
}

export interface IvRadar {
  symbol: string;
  underlying: number | null;
  expiry: string | null;
  atmIv: number | null;
  ivRank: number | null; // 0-100, realised-vol proxy
  ivPercentile: number | null; // 0-100, realised-vol proxy
  riskReversal: number | null; // OTM call IV - OTM put IV
  volatilityRegime: "ELEVATED" | "NORMAL" | "COMPRESSED" | "UNKNOWN";
  realizedVol21d: number | null;
  smile: IvSmilePoint[];
  notes: string[];
  generatedAt: string;
}

export interface IvRadarArgs {
  /** NSE F&O symbol, e.g. RELIANCE. */
  symbol: string;
  /** Expiry date (from get_option_expiries). Defaults to the nearest expiry. */
  expiry?: string;
}

export async function getIvRadar(args: IvRadarArgs): Promise<IvRadar> {
  const symbol = (args.symbol ?? "").trim().toUpperCase();
  if (!symbol) throw new Error("symbol is required");
  const ticker = validateSymbol(symbol);
  const base = ticker.replace(/\.(NS|BO)$/, "");

  const notes: string[] = [];
  let chain = null;
  try {
    chain = await getOptionChain(base, args.expiry);
  } catch {
    chain = null;
  }

  if (!chain || !chain.strikes.length || !chain.underlying) {
    notes.push(
      "Option chain unavailable (stock may be non-F&O, or NSE blocked programmatic access). IV analytics require an active option chain.",
    );
    return {
      symbol: ticker,
      underlying: null,
      expiry: null,
      atmIv: null,
      ivRank: null,
      ivPercentile: null,
      riskReversal: null,
      volatilityRegime: "UNKNOWN",
      realizedVol21d: null,
      smile: [],
      notes,
      generatedAt: new Date().toISOString(),
    };
  }

  const underlying = chain.underlying;
  const strikes = chain.strikes;

  // ATM IV = average of CE+PE IV at the strike closest to spot.
  let atmStrike = strikes[0];
  let best = Infinity;
  for (const s of strikes) {
    const d = Math.abs(s.strikePrice - underlying);
    if (d < best) {
      best = d;
      atmStrike = s;
    }
  }
  const atmIvParts: number[] = [];
  if (atmStrike.ce && atmStrike.ce.impliedVolatility > 0) atmIvParts.push(atmStrike.ce.impliedVolatility);
  if (atmStrike.pe && atmStrike.pe.impliedVolatility > 0) atmIvParts.push(atmStrike.pe.impliedVolatility);
  const atmIv = atmIvParts.length
    ? atmIvParts.reduce((a, b) => a + b, 0) / atmIvParts.length
    : null;

  // Smile: average CE/PE IV per strike.
  const smile: IvSmilePoint[] = strikes
    .map((s) => {
      const parts: number[] = [];
      if (s.ce && s.ce.impliedVolatility > 0) parts.push(s.ce.impliedVolatility);
      if (s.pe && s.pe.impliedVolatility > 0) parts.push(s.pe.impliedVolatility);
      return { strike: s.strikePrice, iv: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null };
    })
    .filter((p) => p.iv != null);

  // 25-delta-style OTM IVs: nearest strike ~2-4% away from spot.
  const callStrike = strikes.find((s) => s.strikePrice >= underlying * 1.02);
  const putStrike = [...strikes].reverse().find((s) => s.strikePrice <= underlying * 0.98);
  const callIv = callStrike?.ce?.impliedVolatility ?? callStrike?.pe?.impliedVolatility ?? null;
  const putIv = putStrike?.pe?.impliedVolatility ?? putStrike?.ce?.impliedVolatility ?? null;
  const riskReversal =
    callIv != null && putIv != null && callIv > 0 && putIv > 0 ? Number((callIv - putIv).toFixed(4)) : null;

  // Realised-vol distribution over the last year for rank/percentile.
  const hist = await fetchDailyBars(ticker, 365).catch(() => ({ ticker, bars: [] as any[] }));
  const closes = hist.bars.map((b) => b.close);
  let ivRank: number | null = null;
  let ivPercentile: number | null = null;
  let realizedVol21d: number | null = null;
  if (closes.length >= 60) {
    const window = 21;
    const series: number[] = [];
    for (let i = window; i < closes.length; i++) {
      const slice = closes.slice(i - window, i + 1);
      const v = annualizedVol(slice);
      if (Number.isFinite(v)) series.push(v);
    }
    const current = annualizedVol(closes.slice(-window));
    if (series.length && Number.isFinite(current)) {
      realizedVol21d = Number(current.toFixed(1));
      const min = Math.min(...series);
      const max = Math.max(...series);
      ivRank = max > min ? Number((((current - min) / (max - min)) * 100).toFixed(1)) : 50;
      // Percentile rank: share of trailing days with realised vol at or below
      // the current reading (0-100).
      const below = series.filter((v) => v <= current).length;
      ivPercentile = Number(((below / series.length) * 100).toFixed(1));
    }
  } else {
    notes.push("Less than 60 days of history; IV rank/percentile skipped.");
  }

  let volatilityRegime: IvRadar["volatilityRegime"] = "UNKNOWN";
  if (atmIv != null && realizedVol21d != null) {
    if (atmIv > realizedVol21d * 1.4) volatilityRegime = "ELEVATED";
    else if (atmIv < realizedVol21d * 0.7) volatilityRegime = "COMPRESSED";
    else volatilityRegime = "NORMAL";
  }

  return {
    symbol: ticker,
    underlying: Number(underlying.toFixed(2)),
    expiry: chain.expiryDates[0] ?? null,
    atmIv: atmIv != null ? Number((atmIv * 100).toFixed(1)) : null,
    ivRank,
    ivPercentile,
    riskReversal,
    volatilityRegime,
    realizedVol21d,
    smile,
    notes,
    generatedAt: new Date().toISOString(),
  };
}
