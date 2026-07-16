import type { Quote } from "../types.js";
export declare class YahooNotFoundError extends Error {
}
export declare class YahooMalformedResponseError extends Error {
}
export declare function parseQuoteSummary(json: unknown, ticker: string): Quote;
