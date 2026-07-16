import { fetchHttp, type HttpFetchOptions, type SourceConfig } from "../http.js";

// Yahoo Finance blocks bot-identified UAs. Mimic a real browser.
// Set NSE_MCP_UA to override (use "Name email" form for SEC-style access).
const USER_AGENT =
  process.env.NSE_MCP_UA ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CONFIG: SourceConfig = {
  name: "Yahoo Finance",
  userAgent: USER_AGENT,
  defaultTtlMs: 15_000,
  defaultAccept: "application/json, text/plain, */*",
  minIntervalMs: 200,
  timeoutMs: 30_000,
  defaultNullStatuses: [404],
};

export const YAHOO_USER_AGENT = CONFIG.userAgent;

export async function fetchYahoo(
  url: string,
  options: HttpFetchOptions & { headers?: Record<string, string> } = {},
): Promise<string | null> {
  return fetchHttp(url, CONFIG, options);
}
