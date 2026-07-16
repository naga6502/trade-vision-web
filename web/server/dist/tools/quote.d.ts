import type { Quote } from "../types.js";
export interface QuoteArgs {
    /**
     * NSE stock symbol, e.g. "RELIANCE", "TCS", "HDFC".
     * The .NS Yahoo Finance suffix is appended automatically.
     * Pass the full Yahoo symbol to override, e.g. "RELIANCE.NS" or "TCS.BO".
     */
    symbol: string;
}
export declare function getStockQuote(args: QuoteArgs): Promise<Quote>;
