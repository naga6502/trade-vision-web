import YahooFinance from "yahoo-finance2";

// Native OHLC history for the price chart. Replaces the third-party TradingView
// advanced-chart embed so the main chart always renders without an external
// widget host.

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistoryArgs {
  symbol: string;
  range?: string; // 1W | 1M | 3M | 6M | 1Y (default 3M)
}

const RANGES: Record<string, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

const SYMBOL_RE = /^[A-Z0-9&._-]{1,25}$/;

export async function getPriceHistory(args: PriceHistoryArgs): Promise<{
  symbol: string;
  range: string;
  bars: PriceBar[];
}> {
  const raw = (args.symbol ?? "").trim();
  if (!raw) throw new Error("symbol is required");
  const upper = raw.toUpperCase();
  const ticker = /\.[A-Z]{1,3}$/.test(upper) ? upper : `${upper}.NS`;
  if (!SYMBOL_RE.test(ticker.replace(".NS", "").replace(".BO", ""))) {
    throw new Error(`invalid symbol: ${JSON.stringify(raw)}`);
  }

  const range = (args.range || "3M").toUpperCase();
  const days = RANGES[range] ?? 90;
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - days * 24 * 3600;

  const r = await yahooFinance.chart(ticker, {
    period1: p1,
    period2: now,
    interval: "1d",
  });

  const bars: PriceBar[] = (r?.quotes ?? [])
    .filter((q: any) => q && typeof q.close === "number" && q.high != null && q.low != null)
    .map((q: any) => {
      const qd = q.date ? (q.date instanceof Date ? q.date : new Date(q.date)) : null;
      const date = qd && !isNaN(qd.getTime()) ? qd.toISOString().slice(0, 10) : "";
      return {
        date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      };
    });

  return { symbol: ticker, range, bars };
}
