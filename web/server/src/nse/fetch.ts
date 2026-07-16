import { fetchHttp, type SourceConfig } from "../http.js";
import { cacheGet, cacheSet } from "../cache.js";
import { getSessionCookies, invalidateSession, NSE_USER_AGENT } from "./session.js";

const NSE_BASE = "https://www.nseindia.com";
// Live market data is refreshed frequently during market hours; 15s keeps the
// dashboard/quotes feeling real-time without hammering NSE too hard. The client
// polls every 10s, so a 15s window means data lands within ~1-2 polls. Daily
// data (bulk/block deals, insider trades, announcements, corporate actions)
// changes at most once per session, but a short TTL is harmless for those too.
const DEFAULT_TTL_MS = 15 * 1000;

const NSE_CONFIG: SourceConfig = {
  name: "NSE India",
  userAgent: NSE_USER_AGENT,
  defaultTtlMs: DEFAULT_TTL_MS,
  defaultAccept: "application/json, text/plain, */*",
  minIntervalMs: 350,
  timeoutMs: 30_000,
  // 401/403 can mean the session expired — handled below with retry.
  defaultNullStatuses: [],
};

export interface NseFetchOptions {
  ttlMs?: number;
  noCache?: boolean;
}

export async function fetchNSE<T>(path: string, options: NseFetchOptions = {}): Promise<T> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const useCache = !options.noCache;
  const cacheKey = `nse:${path}`;

  if (useCache) {
    const cached = cacheGet<T>(cacheKey);
    if (cached !== undefined) return cached;
  }

  const doRequest = async (): Promise<string> => {
    const cookies = await getSessionCookies();
    const url = `${NSE_BASE}${path}`;
    const text = await fetchHttp(url, NSE_CONFIG, {
      cache: false,
      headers: {
        Cookie: cookies,
        Referer: NSE_BASE,
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (text === null) throw new Error(`NSE API: no response for ${path}`);
    return text;
  };

  let text: string;
  try {
    text = await doRequest();
  } catch (err) {
    // On first failure, invalidate session and retry once.
    invalidateSession();
    text = await doRequest();
  }

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`NSE API: non-JSON response for ${path}`);
  }

  if (useCache) cacheSet(cacheKey, data, ttl);
  return data;
}
