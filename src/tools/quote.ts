import type { Quote } from "../types.js";
import { getQuote } from "../yahoo/quoteSummary.js";

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

  return getQuote(ticker);
}
