// NSE India's API requires an active browser-like session established by
// first visiting the homepage. We do a two-step session init (homepage →
// market-data page) and cache the resulting cookies for SESSION_TTL_MS.
const NSE_HOME = "https://www.nseindia.com";
const NSE_MARKET_PAGE = "https://www.nseindia.com/market-data/live-equity-market";
const SESSION_TTL_MS = 7 * 60 * 1000; // 7 minutes; NSE sessions last ~10 min
export const NSE_USER_AGENT = process.env.NSE_MCP_UA ??
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let cookieJar = "";
let sessionExpiry = 0;
function parseCookies(response) {
    // Node 18+ exposes getSetCookie(); fall back to parsing the raw header.
    const raw = response.headers;
    const arr = typeof raw.getSetCookie === "function" ? raw.getSetCookie() : [];
    if (arr.length) {
        return arr.map((c) => c.split(";")[0]).join("; ");
    }
    const single = response.headers.get("set-cookie");
    if (!single)
        return "";
    return single
        .split(",")
        .map((c) => c.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");
}
function mergeCookies(...jars) {
    const map = new Map();
    for (const jar of jars) {
        for (const pair of jar.split(";")) {
            const trimmed = pair.trim();
            const eq = trimmed.indexOf("=");
            if (eq > 0)
                map.set(trimmed.slice(0, eq).trim(), trimmed);
        }
    }
    return Array.from(map.values()).join("; ");
}
async function refreshSession() {
    const baseHeaders = {
        "User-Agent": NSE_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    };
    const homeRes = await fetch(NSE_HOME, {
        headers: {
            ...baseHeaders,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
    });
    const homeCookies = parseCookies(homeRes);
    // Small pause between requests to mimic a real browser.
    await new Promise((r) => setTimeout(r, 300));
    const marketRes = await fetch(NSE_MARKET_PAGE, {
        headers: {
            ...baseHeaders,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            Cookie: homeCookies,
            Referer: NSE_HOME,
        },
    });
    const marketCookies = parseCookies(marketRes);
    cookieJar = mergeCookies(homeCookies, marketCookies);
    sessionExpiry = Date.now() + SESSION_TTL_MS;
    return cookieJar;
}
export async function getSessionCookies() {
    if (cookieJar && Date.now() < sessionExpiry)
        return cookieJar;
    return refreshSession();
}
export function invalidateSession() {
    cookieJar = "";
    sessionExpiry = 0;
}
//# sourceMappingURL=session.js.map