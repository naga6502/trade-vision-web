// Unified market-data layer.
//
// Strategy: prefer the remote tapetide MCP server (49 tools, live NSE data);
// fall back to the local compiled NSE tools (lib/mcp -> dist/) when the remote
// call is unavailable, errors, or returns truncated/unparseable payloads.
//
// The remote caps large responses at ~25k chars, returning truncated (invalid)
// JSON for the biggest tools (trending stocks, market pulse, FII/DII, IPO).
// Those endpoints are therefore served from the local API, which the caller
// asked to keep as the fallback ("use call back to other apis"). Endpoints the
// remote serves cleanly (quote, company profile + financials, bulk/block deals)
// are MCP-first.

import { callTool } from "@/lib/mcpClient";
import { mcp as local } from "@/lib/mcp";
import { getNews, type NewsResult, type NewsItem } from "@/lib/news";
import type {
  Quote,
  Fundamentals,
  BulkDeal,
  NseStock,
  FiiDiiActivity,
  NseIndex,
  NiftyMoversResult,
  NseAnnouncement,
  GlobalIndex,
  MarketStatusItem,
  Ipo,
  DealType,
  Technical,
  PatternAnalysis,
  IncomeStatementRow,
  CashFlowYear,
} from "@/lib/mcp";

export type Result<T> = { data?: T; error?: string };

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface PriceHistory {
  symbol: string;
  range: string;
  bars: PriceBar[];
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Call a remote tool and parse its first text block. Returns null on any
// failure: transport error, isError, or truncated/unparseable JSON (the 25k
// cap the remote applies to large payloads).
async function remote(
  name: string,
  args: Record<string, unknown> = {},
): Promise<any | null> {
  try {
    const r = await callTool(name, args);
    if (r.isError) return null;
    const text = r.content?.[0]?.text;
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null; // truncated payload
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// quote — MCP-first (get_stock_quote), overlay onto local Yahoo fundamentals.
// ---------------------------------------------------------------------------
export async function quote(symbol: string): Promise<Result<Quote>> {
  const localRes = await local.quote(symbol);
  const q = await remote("get_stock_quote", { symbol });
  const d = q?.data;

  if (localRes.data && d) {
    return {
      data: {
        ...localRes.data,
        ticker: d.symbol || localRes.data.ticker,
        price: num(d.price) ?? localRes.data.price,
        previousClose: num(d.prev_close) ?? localRes.data.previousClose,
        volume: num(d.volume) ?? localRes.data.volume,
        timestamp: d.updated_at || localRes.data.timestamp,
      },
    };
  }
  if (d && d.found !== false) {
    return {
      data: {
        ticker: d.symbol || symbol,
        name: d.name ?? d.company_name ?? null,
        exchange: "NSE",
        currency: "INR",
        timestamp: d.updated_at || new Date().toISOString(),
        price: num(d.price) ?? 0,
        previousClose: num(d.prev_close) ?? 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        volume: num(d.volume) ?? 0,
        averageVolume: null,
        marketCap: null,
        beta: null,
        trailingPE: null,
        forwardPE: null,
        dividendYield: null,
        exDividendDate: null,
        earningsDate: null,
      },
    };
  }
  return localRes;
}

// ---------------------------------------------------------------------------
// fundamentals — MCP-first. Build from remote when local fails; otherwise
// overlay the fresher remote quote/valuation onto the local record (which
// already carries the full statement history the UI needs).
// ---------------------------------------------------------------------------
export async function fundamentals(
  symbol: string,
): Promise<Result<Fundamentals>> {
  const localRes = await local.fundamentals(symbol);
  const [profile, pl, bs, cf] = await Promise.all([
    remote("get_company_profile", { symbol }),
    remote("get_financials", { symbol, section: "profit_loss" }),
    remote("get_financials", { symbol, section: "balance_sheet" }),
    remote("get_financials", { symbol, section: "cash_flow" }),
  ]);

  const prof = profile?.data;

  if (!localRes.data) {
    const built = buildFromRemote(symbol, prof, pl?.data?.[0], bs?.data?.[0], cf?.data?.[0]);
    return built ? { data: built } : localRes;
  }

  const base: Fundamentals = { ...localRes.data };
  if (prof) {
    const q = prof.quote || {};
    const f = prof.fundamentals || {};
    const comp = prof.company || {};
    if (q.price != null) base.price = num(q.price) ?? base.price;
    if (q.prev_close != null) base.previousClose = num(q.prev_close) ?? base.previousClose;
    if (q.high != null) base.dayHigh = num(q.high);
    if (q.low != null) base.dayLow = num(q.low);
    if (q.volume != null) base.volume = num(q.volume);
    if (comp.name) base.name = String(comp.name).trim();
    if (f.stock_pe != null) base.trailingPE = num(f.stock_pe);
    if (f.price_to_book != null) base.priceToBook = num(f.price_to_book);
    if (f.eps != null) base.eps = num(f.eps);
    if (f.dividend_yield != null) base.dividendYield = num(f.dividend_yield);
    if (f.debt_to_equity != null) base.debtToEquity = num(f.debt_to_equity);
    if (f.high_52w != null) base.fiftyTwoWeekHigh = num(f.high_52w);
    if (f.low_52w != null) base.fiftyTwoWeekLow = num(f.low_52w);
    if (f.market_cap != null) base.marketCap = num(f.market_cap)! * 1e7;
  }
  return { data: base };
}

function buildFromRemote(
  symbol: string,
  prof: any,
  pl: any,
  bs: any,
  cf: any,
): Fundamentals | null {
  if (!prof) return null;
  const q = prof.quote || {};
  const f = prof.fundamentals || {};
  const comp = prof.company || {};

  const base: Fundamentals = {
    ticker: q.symbol || symbol,
    name: comp.name ? String(comp.name).trim() : q.name || symbol,
    currency: "INR",
    exchange: "NSE",
    timestamp: q.updated_at || new Date().toISOString(),
    price: num(q.price) ?? 0,
    previousClose: num(q.prev_close) ?? 0,
    dayHigh: num(q.high) ?? null,
    dayLow: num(q.low) ?? null,
    fiftyTwoWeekHigh: num(f.high_52w) ?? null,
    fiftyTwoWeekLow: num(f.low_52w) ?? null,
    volume: num(q.volume) ?? null,
    averageVolume: null,
    marketCap: f.market_cap != null ? num(f.market_cap)! * 1e7 : null,
    beta: null,
    trailingPE: num(f.stock_pe) ?? null,
    forwardPE: null,
    priceToBook: num(f.price_to_book) ?? null,
    eps: num(f.eps) ?? null,
    dividendYield: num(f.dividend_yield) ?? null,
    profitMargins: null,
    operatingMargins: null,
    grossMargins: null,
    returnOnEquity: null,
    returnOnAssets: null,
    debtToEquity: num(f.debt_to_equity) ?? null,
    currentRatio: null,
    totalCash: null,
    totalDebt: null,
    freeCashflow: null,
    revenueGrowth: null,
    earningsGrowth: null,
    targetMeanPrice: null,
    recommendationMean: null,
    recommendationTrend: [],
    majorHolders: {
      insidersPercentHeld: null,
      institutionsPercentHeld: null,
      institutionsFloatPercentHeld: null,
      institutionsCount: null,
    },
    cashflow: transposeCashflow(cf),
    incomeStatementQuarterly: [],
    incomeStatementAnnual: transposePL(pl),
  };

  if (bs?.data?.["Borrowings"]) {
    const periods = bs.periods || [];
    const last = periods[periods.length - 1];
    if (last != null) base.totalDebt = num(bs.data["Borrowings"][last]);
  }

  return base;
}

// Remote financial sections are pivoted: { Metric: { "Mar 2026": value } }
// with a parallel `periods` array. Transpose back to row-per-period.
function transposePL(section: any): IncomeStatementRow[] {
  const metrics = section?.data;
  const periods = section?.periods || [];
  if (!metrics || !periods.length) return [];
  return periods.map((p: string) => ({
    periodEnd: p,
    totalRevenue: num(metrics["Sales"]?.[p]) ?? null,
    costOfRevenue: null,
    grossProfit: null,
    operatingIncome: num(metrics["Operating Profit"]?.[p]) ?? null,
    ebit: num(metrics["Profit before tax"]?.[p]) ?? null,
    ebitda: null,
    netIncome: num(metrics["Net Profit"]?.[p]) ?? null,
    netIncomeCommonStockholders: num(metrics["Net Profit"]?.[p]) ?? null,
    dilutedEPS: num(metrics["EPS in Rs"]?.[p]) ?? null,
  }));
}

function transposeCashflow(section: any): CashFlowYear[] {
  const metrics = section?.data;
  const periods = section?.periods || [];
  if (!metrics || !periods.length) return [];
  return periods.map((p: string) => ({
    fiscalDate: p,
    operating: num(metrics["Cash from Operating Activity"]?.[p]) ?? null,
    investing: num(metrics["Cash from Investing Activity"]?.[p]) ?? null,
    financing: num(metrics["Cash from Financing Activity"]?.[p]) ?? null,
    freeCashFlow: num(metrics["Free Cash Flow"]?.[p]) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// bulkDeals — MCP-first (market_deals: BULK/BLOCK deals), filter client-side.
// ---------------------------------------------------------------------------
export async function bulkDeals(
  symbol?: string,
  dealType: DealType = "ALL",
): Promise<Result<BulkDeal[]>> {
  const localRes = await local.bulkDeals(symbol, dealType);
  const d = await remote("market_deals", {});
  if (Array.isArray(d?.data) && d.data.length) {
    let mapped: BulkDeal[] = d.data.map((x: any) => ({
      date: String(x.date || "").slice(0, 10),
      symbol: x.sym,
      name: x.csym || x.cname || "",
      clientName: x.cname || "",
      dealType: x.bs === "B" ? "BUY" : x.bs === "S" ? "SELL" : "BUY",
      quantity: num(x.qty) ?? 0,
      price: num(x.avgprice) ?? 0,
    }));
    if (symbol) mapped = mapped.filter((x) => x.symbol === symbol.toUpperCase());
    if (dealType && dealType !== "ALL")
      mapped = mapped.filter((x) => x.dealType === dealType);
    if (mapped.length) return { data: mapped };
  }
  return localRes;
}

// ---------------------------------------------------------------------------
// Everything else delegates to the local tools. The remote equivalents for
// these (trending stocks, market pulse, FII/DII, IPO) truncate at the server's
// 25k cap and can't be parsed, so local is the reliable source here.
// ---------------------------------------------------------------------------
export const topGainers = (limit = 10) => local.topGainers(limit);
export const topLosers = (limit = 10) => local.topLosers(limit);
export const mostActive = (limit = 10, index?: string) =>
  local.mostActive(limit, index);
export const niftyIndices = (name?: string) => local.niftyIndices(name);
export const niftyMovers = (limit = 8) => local.niftyMovers(limit);
export const fiiDii = (limit = 10) => local.fiiDii(limit);
export const marketStatus = () => local.marketStatus();
export const globalMarkets = () => local.globalMarkets();
export const announcements = (limit = 20, daysBack?: number) =>
  local.announcements(limit, daysBack);
// ---------------------------------------------------------------------------
// technical — local supplies the full Technical object (oscillators, moving
// averages, volatility, patterns). Overlay Tapetide's multi-factor quant
// signal (get_quant_signal) onto the summary when available.
// ---------------------------------------------------------------------------
export async function technical(symbol: string): Promise<Result<Technical>> {
  const localRes = await local.technical(symbol);
  const q = await remote("get_quant_signal", { symbol });
  if (localRes.data && q?.data) {
    const signal = String(q.data.signal || "HOLD").toUpperCase();
    const label = signal.includes("STRONG BUY")
      ? "STRONG BUY"
      : signal.includes("BUY")
        ? "BUY"
        : signal.includes("STRONG SELL")
          ? "STRONG SELL"
          : signal.includes("SELL")
            ? "SELL"
            : "NEUTRAL";
    const score =
      typeof q.data.composite_score === "number"
        ? (q.data.composite_score / 100) * 2 - 1
        : localRes.data.summary.score;
    const buy = signal.includes("BUY") ? 1 : 0;
    const sell = signal.includes("SELL") ? 1 : 0;
    const neutral = buy || sell ? 0 : 1;
    return {
      data: {
        ...localRes.data,
        summary: { ...localRes.data.summary, label, score, buy, neutral, sell },
      },
    };
  }
  return localRes;
}

// ---------------------------------------------------------------------------
// patternAnalysis — local-only (no remote equivalent). Multi-horizon
// chart-pattern engine: intraday 15m, short-term 3M daily, long-term 1Y
// daily, each with classic + candlestick pattern reads.
// ---------------------------------------------------------------------------
export async function patternAnalysis(
  symbol: string,
): Promise<Result<PatternAnalysis>> {
  return local.patternAnalysis(symbol);
}

// ---------------------------------------------------------------------------
// news — MCP-first (get_market_news / get_stock_events with type:"news"),
// falling back to the local RSS aggregator when remote is unavailable,
// errors, or returns nothing.
// ---------------------------------------------------------------------------
function normNewsItem(it: any): NewsItem | null {
  if (!it) return null;
  const title = it.title || it.headline || it.name || "";
  if (!title) return null;
  return {
    title: String(title),
    url: String(it.url || it.link || it.news_url || ""),
    published: String(
      it.published_at || it.date || it.published || it.timestamp || "",
    ),
    summary: String(
      it.summary || it.description || it.text || it.snippet || "",
    ).slice(0, 400),
    source: String(it.source || it.publisher || it.channel || "Tapetide"),
  };
}

export async function news(opts: {
  symbol?: string;
  category?: string;
  limit?: number;
}): Promise<NewsResult> {
  const { symbol, category = "stocks", limit = 20 } = opts;
  const sym = symbol
    ? symbol.replace(/\.(NS|BO)$/, "").toUpperCase()
    : undefined;
  try {
    const r = sym
      ? await remote("get_stock_events", { symbol: sym, type: "news" })
      : await remote("get_market_news", {});
    const parsed = r?.data ?? r;
    const raw: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
        ? parsed.data
        : [];
    if (raw.length) {
      const items = raw
        .map(normNewsItem)
        .filter((x): x is NewsItem => x !== null);
      const sliced = items.slice(0, limit);
      return {
        items: sliced,
        count: items.length,
        provider: "tapetide",
        symbol: sym ?? null,
        category,
        isError: false,
        note: sym ? undefined : "via Tapetide market news",
      };
    }
  } catch {
    /* fall through to RSS */
  }
  return getNews({ symbol: sym, category, limit });
}

// ---------------------------------------------------------------------------
// fundamentalScreener — remote screen_stocks (Tapetide 326-ratio screener).
// Best-effort field mapping; returns [] if remote is unavailable so the
// existing movers/imbalance screener (local) stays the primary view.
// ---------------------------------------------------------------------------
export interface FundamentalRow {
  symbol: string;
  name: string;
  sector: string;
  pe: number | null;
  roe: number | null;
  marketCap: number | null;
  price: number | null;
  changePct: number | null;
}

export interface ScreenerIndicators {
  rsi?: number;
  adx?: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
  atr?: number;
  bbWidth?: number;
  volumeAvg?: number;
  volumeCurrent?: number;
  volRatio?: number;
}

export interface ScreenerResult {
  symbol: string;
  name?: string;
  screenName: string;
  score: number;
  reason: string;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  momentum: "STRONG" | "WEAK" | "NEUTRAL";
  volume: "HIGH" | "NORMAL" | "LOW";
  risk: "LOW" | "MEDIUM" | "HIGH";
  price: number;
  changePct: number;
  indicators: ScreenerIndicators;
  pattern: string;
}

export interface ScreenerScreen {
  name: string;
  description: string;
  scoreWeight: number;
  results: ScreenerResult[];
}

export interface ScreenerOutput {
  requested: string;
  screens: ScreenerScreen[];
  universeSize: number;
  generatedAt: string;
}

export async function fundamentalScreener(
  params: Record<string, unknown> = {},
): Promise<FundamentalRow[]> {
  const r = await remote("screen_stocks", params);
  if (!r) return [];
  const arr: any[] = Array.isArray(r)
    ? r
    : Array.isArray(r?.data)
      ? r.data
      : Array.isArray(r?.results)
        ? r.results
        : [];
  if (!arr.length) return [];
  return arr
    .map((x) => ({
      symbol: String(
        x.symbol || x.ticker || x.scrip || x.ns_symbol || "",
      ).toUpperCase(),
      name: String(x.name || x.company || ""),
      sector: String(x.sector || x.industry || ""),
      pe: num(x.pe || x.pe_ratio || x.pe_ttm),
      roe: num(x.roe || x.return_on_equity),
      marketCap: num(x.market_cap || x.marketCap),
      price: num(x.price || x.ltp || x.last_price),
      changePct: num(x.change_pct || x.pchange || x.day_change_pct),
    }))
    .filter((x) => x.symbol);
}
export const searchBySymbol = (symbol: string, daysBack = 30) =>
  local.searchBySymbol(symbol, daysBack);
export const ipoCalendar = (
  status?: string,
  exchange?: string,
  limit = 20,
) => local.ipoCalendar(status, exchange, limit);
export const ipoDetails = (symbol?: string, companyName?: string) =>
  local.ipoDetails(symbol, companyName);

// ---------------------------------------------------------------------------
// screener — the technical screen engine (runScreener in dist/tools/screener.js).
// Takes a symbol universe and returns ranked candidates per screen style.
// ---------------------------------------------------------------------------
export async function screener(args: {
  symbols: string[];
  screenType?: string;
  limit?: number;
  minVolume?: number;
}): Promise<Result<ScreenerOutput>> {
  return local.screener({
    symbols: args.symbols,
    screenType: args.screenType,
    limit: args.limit,
    minVolume: args.minVolume,
  });
}

// Aggregate object so routes can do `import { marketData as mcp }` and call
// mcp.fundamentals(...), mcp.topGainers(...), etc.
export const marketData = {
  quote,
  fundamentals,
  bulkDeals,
  topGainers,
  topLosers,
  mostActive,
  niftyIndices,
  niftyMovers,
  fiiDii,
  marketStatus,
  globalMarkets,
  announcements,
  technical,
  patternAnalysis,
  news,
  fundamentalScreener,
  searchBySymbol,
  ipoCalendar,
  ipoDetails,
  screener,
  priceHistory: (symbol: string, range = "3M") => local.priceHistory(symbol, range),
  optionPressure: (symbol: string, expiry?: string) =>
    local.optionPressure(symbol, expiry),
  ivRadar: (symbol: string, expiry?: string) => local.ivRadar(symbol, expiry),
  aiPrediction: (symbol: string) => local.aiPrediction(symbol),
  analyzeStock: (symbol: string) => local.analyzeStock(symbol),
  researchReport: (symbol: string) => local.researchReport(symbol),
  equityCurves: (symbol: string, windowDays?: number) =>
    local.equityCurves(symbol, windowDays),
  monteCarlo: (
    symbol: string,
    horizonDays?: number,
    paths?: number,
    historicalDays?: number,
  ) => local.monteCarlo(symbol, horizonDays, paths, historicalDays),
  pretradeRisk: (
    symbol: string,
    entryPrice?: number,
    riskRupees?: number,
    stopMultiple?: number,
  ) => local.pretradeRisk(symbol, entryPrice, riskRupees, stopMultiple),
  stockImages: (symbol: string, bars?: number) => local.stockImages(symbol, bars),
};

// Re-export the local types so routes can import everything from one module.
export type {
  NseStock,
  FiiDiiActivity,
  NseIndex,
  NiftyMoversResult,
  NseAnnouncement,
  GlobalIndex,
  MarketStatusItem,
  Ipo,
  DealType,
} from "@/lib/mcp";
