import { cacheGet, cacheSet } from "../cache.js";
const BSE_BASE = "https://www.bseindia.com";
const BSE_HOME = `${BSE_BASE}/`;
// BSE requires its own session cookies (separate from NSE). Refresh by
// visiting the homepage, like NSE. VERIFY: BSE may also need a market-data
// page prime for some endpoints; adjust refreshSession if a call returns empty.
const SESSION_TTL_MS = 7 * 60 * 1000;
const BSE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let cookieJar = "";
let sessionExpiry = 0;
function parseCookies(res) {
    const raw = res.headers;
    const arr = typeof raw.getSetCookie === "function" ? raw.getSetCookie() : [];
    if (arr.length)
        return arr.map((c) => c.split(";")[0]).join("; ");
    const single = res.headers.get("set-cookie");
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
            const eq = pair.indexOf("=");
            if (eq > 0)
                map.set(pair.slice(0, eq).trim(), pair);
        }
    }
    return Array.from(map.values()).join("; ");
}
async function refreshSession() {
    const headers = {
        "User-Agent": BSE_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    };
    const home = await fetch(BSE_HOME, { headers, signal: AbortSignal.timeout(30000) });
    cookieJar = parseCookies(home);
    sessionExpiry = Date.now() + SESSION_TTL_MS;
    return cookieJar;
}
async function getCookies() {
    if (cookieJar && Date.now() < sessionExpiry)
        return cookieJar;
    return refreshSession();
}
export async function fetchBSE(path, options = {}) {
    const ttl = options.ttlMs ?? 15_000;
    const useCache = !options.noCache;
    const key = `bse:${path}`;
    if (useCache) {
        const cached = cacheGet(key);
        if (cached !== undefined)
            return cached;
    }
    const cookies = await getCookies();
    const res = await fetch(`${BSE_BASE}${path}`, {
        headers: {
            "User-Agent": BSE_UA,
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
            Referer: BSE_HOME,
            Cookie: cookies,
        },
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
        // Invalidate session once on failure, like NSE.
        cookieJar = "";
        sessionExpiry = 0;
        throw new Error(`BSE API ${res.status} for ${path}`);
    }
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        throw new Error(`BSE API non-JSON for ${path}`);
    }
    if (useCache)
        cacheSet(key, data, ttl);
    return data;
}
//# sourceMappingURL=bse.js.map