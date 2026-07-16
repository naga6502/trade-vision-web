import { fetchYahoo } from "./fetch.js";
import { parseQuoteSummary, YahooNotFoundError, YahooMalformedResponseError, } from "./parseQuote.js";
const QUOTE_PAGE_BASE = "https://finance.yahoo.com/quote";
// Yahoo's quote page server-side renders a SvelteKit app and embeds every
// pre-fetched JSON response in a <script type="application/json
// data-sveltekit-fetched data-url="<api-url>"> tag. Among those is the
// quoteSummary v10 response with the modules we need.
const SCRIPT_TAG_RE = /<script[^>]*type="application\/json"[^>]*data-sveltekit-fetched[^>]*data-url="([^"]+)"[^>]*>([\s\S]*?)<\/script>/g;
function decodeHtmlEntities(s) {
    return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
}
function findQuoteSummaryScript(html, ticker) {
    const tickerPath = `/quoteSummary/${ticker}?`;
    SCRIPT_TAG_RE.lastIndex = 0;
    let m;
    while ((m = SCRIPT_TAG_RE.exec(html)) !== null) {
        const url = decodeHtmlEntities(m[1]);
        if (url.includes(tickerPath) &&
            url.includes("summaryDetail") &&
            url.includes("defaultKeyStatistics")) {
            return m[2];
        }
    }
    return null;
}
export async function getQuote(ticker) {
    const url = `${QUOTE_PAGE_BASE}/${encodeURIComponent(ticker)}/`;
    const html = await fetchYahoo(url, {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        headers: {
            "Accept-Language": "en-US,en;q=0.9",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1"
        },
    });
    if (html == null) {
        throw new YahooNotFoundError(`ticker not found: ${ticker}`);
    }
    const scriptBody = findQuoteSummaryScript(html, ticker);
    if (scriptBody == null) {
        throw new YahooMalformedResponseError(`Yahoo Finance: no embedded quoteSummary script tag for ${ticker}`);
    }
    let outer;
    try {
        outer = JSON.parse(scriptBody);
    }
    catch (err) {
        throw new YahooMalformedResponseError(`Yahoo Finance: outer script JSON unparseable for ${ticker}: ${err.message}`);
    }
    const body = outer.body;
    if (typeof body !== "string") {
        throw new YahooMalformedResponseError(`Yahoo Finance: embedded script missing body for ${ticker}`);
    }
    let inner;
    try {
        inner = JSON.parse(body);
    }
    catch (err) {
        throw new YahooMalformedResponseError(`Yahoo Finance: inner body JSON unparseable for ${ticker}: ${err.message}`);
    }
    return parseQuoteSummary(inner, ticker);
}
//# sourceMappingURL=quoteSummary.js.map