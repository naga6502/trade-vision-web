import type { Quote } from "../types.js";
import YahooFinance from "yahoo-finance2";

// Instantiate YahooFinance as required by newer versions
const yahooFinance = new YahooFinance();

export interface QuoteArgs {
  /**
   * NSE stock symbol, e.g. "RELIANCE", "TCS", "HDFC".
   * The .NS Yahoo Finance suffix is appended automatically.
   * Pass the full Yahoo symbol to override, e.g. "RELIANCE.NS" or "TCS.BO".
   */
  symbol: string;
}

// NSE symbols are 1-20 uppercase alphanumeric characters (some have & or -).
// After normalising, the Yahoo ticker (with .NS) must pass the broader RE.
const SYMBOL_RE = /^[A-Z0-9&._-]{1,25}$/;

export async function getStockQuote(args: QuoteArgs): Promise<Quote> {
  const raw = (args.symbol ?? "").trim();
  if (!raw) throw new Error("symbol is required");

  const upper = raw.toUpperCase();
  // If caller already added an exchange suffix (.NS / .BO) use it as-is;
  // otherwise default to NSE (.NS).
  const ticker = /\.[A-Z]{1,3}$/.test(upper) ? upper : `${upper}.NS`;

  if (!SYMBOL_RE.test(ticker.replace(".NS", "").replace(".BO", ""))) {
    throw new Error(`invalid symbol: ${JSON.stringify(raw)}`);
  }

  try {
    const result = await yahooFinance.quote(ticker);

    return {
      ticker: result.symbol,
      exchange: result.exchange ?? null,
      currency: result.currency ?? "INR",
      timestamp: result.regularMarketTime
        ? new Date(result.regularMarketTime).toISOString()
        : new Date().toISOString(),
      price: result.regularMarketPrice ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? 0,
      volume: result.regularMarketVolume ?? 0,
      averageVolume: result.averageDailyVolume3Month ?? null,
      marketCap: result.marketCap ?? null,
      beta: (result as any).beta ?? null,
      trailingPE: result.trailingPE ?? null,
      forwardPE: result.forwardPE ?? null,
      dividendYield: result.dividendYield ?? null,
      exDividendDate: null, // Not directly available in quote result
      earningsDate: result.earningsTimestamp
        ? new Date(result.earningsTimestamp).toISOString()
        : null,
    };
  } catch (error) {
    throw new Error(`Yahoo Finance failed for ${ticker}: ${(error as Error).message}`);
  }
}
