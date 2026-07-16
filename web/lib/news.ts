// Direct, key-free financial news for the dashboard.
//
// Replaces the previous dependency on the external TradingView MCP server's
// `financial_news` tool. We aggregate public RSS feeds (Indian + global market
// news) server-side and optionally filter by symbol. No API key, no external
// MCP host, no MARKETAUX_TOKEN required — it works out of the box.

import Parser from "rss-parser";

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; AlphaTerminal/1.0)" },
});

interface FeedSource {
  name: string;
  url: string;
}

// Indian-market focused feeds. Add/remove freely — items are merged & sorted.
const MARKET_FEEDS: FeedSource[] = [
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/latestnews.xml" },
  { name: "LiveMint", url: "https://www.livemint.com/rss/news" },
  {
    name: "Economic Times",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
  },
  { name: "CNBC TV18", url: "https://www.cnbctv18.com/market/rss/" },
];

export interface NewsItem {
  title: string;
  url: string;
  published: string;
  summary: string;
  source: string;
}

export interface NewsResult {
  items: NewsItem[];
  count: number;
  provider: string;
  symbol: string | null;
  category: string;
  error?: string;
  note?: string;
  isError: boolean;
}

// Module-level cache so we don't hammer the feeds on every request.
let feedCache: { at: number; items: NewsItem[] } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function stripHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Keywords that signal a headline is about stocks / equity markets. Used to
// keep only stock-related news in the Market News view and filter out
// politics, sports, entertainment and other non-market items.
const STOCK_KEYWORDS = [
  "stock", "stocks", "share", "shares", "shareholder", "equity", "equities",
  "nse", "bse", "sensex", "nifty", "midcap", "smallcap", "largecap",
  "ipo", "listing", "listed", "bull", "bear", "selloff", "sell-off", "correction",
  "earnings", "result", "results", "dividend", "buyback", "bonus",
  "fii", "dii", "mutual fund", "fund", "rupee", "dollar", "forex", "crude", "oil",
  "gold", "silver", "commodity", "commodities", "promoter", "stake",
  "merger", "acquisition", "sebi", "rbi", "trading", "trader", "f&o",
  "futures", "options", "index", "indices", "scrip", "bourse", "bourses",
  "dalal", "record", "surge", "slump", "gain", "gains", "gainer",
  "gainers", "loser", "losers", "jump", "fall", "falls", "rose", "rise",
  "drop", "target", "rating", "upgrade", "downgrade", "outlook", "guidance",
  "quarterly", "profit", "revenue", "sales", "order", "orders", "contract",
  "deal", "market", "markets", "economy", "economic", "gdp", "inflation",
  "budget", "capex", "debt", "loan", "nbfc", "bank", "banks", "banking",
  "psu", "fmcg", "pharma", "auto", "metal", "realty", "reality", "gas",
  "telecom", "cement", "investor", "investors", "portfolio",
  "q1", "q2", "q3", "q4",
];

const STOCK_RE = new RegExp(
  "\\b(" + STOCK_KEYWORDS.map(escapeRegex).join("|") + ")\\b",
  "i"
);

function isStockRelated(text: string): boolean {
  return STOCK_RE.test(text);
}

async function fetchFeed(src: FeedSource): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(src.url);
    return (feed.items || []).map((it) => ({
      title: stripHtml(it.title || ""),
      url: it.link || "",
      published: it.isoDate || it.pubDate || "",
      summary: stripHtml(it.contentSnippet || it.content || (it as any).summary || "").slice(0, 300),
      source: src.name,
    }));
  } catch {
    return [];
  }
}

async function getAllItems(): Promise<NewsItem[]> {
  const now = Date.now();
  if (feedCache && now - feedCache.at < CACHE_TTL_MS) return feedCache.items;
  const batches = await Promise.all(MARKET_FEEDS.map(fetchFeed));
  const items = batches
    .flat()
    .sort((a, b) => Date.parse(b.published || "0") - Date.parse(a.published || "0"));
  feedCache = { at: now, items };
  return items;
}

// Latest financial news. Pass `symbol` to restrict to a single stock
// (keyword filter on title + summary); omit it for all-market news.
export async function getNews(opts: {
  symbol?: string;
  category?: string;
  limit?: number;
}): Promise<NewsResult> {
  const limit = opts.limit ?? 20;
  const symbol = opts.symbol ? opts.symbol.replace(/\.(NS|BO)$/, "").toUpperCase() : undefined;
  const category = opts.category ?? "stocks";

  try {
    let items = await getAllItems();

    if (symbol) {
      // Word-boundary, case-insensitive match so "IDEA" doesn't hit "IDEAL".
      const re = new RegExp(`\\b${escapeRegex(symbol)}\\b`, "i");
      items = items.filter((it) => re.test(it.title) || re.test(it.summary));
    } else {
      // Market News: keep only stock / equity-market related headlines and
      // filter out politics, sports, entertainment and other non-stock news.
      items = items.filter((it) => isStockRelated(`${it.title} ${it.summary}`));
    }

    return {
      items: items.slice(0, limit),
      count: items.length,
      provider: "rss",
      symbol: symbol ?? null,
      category,
      note: symbol ? undefined : "Filtered to stock-related news",
      isError: false,
    };
  } catch (e) {
    return {
      items: [],
      count: 0,
      provider: "rss",
      symbol: symbol ?? null,
      category,
      isError: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
