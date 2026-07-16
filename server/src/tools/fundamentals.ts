import YahooFinance from "yahoo-finance2";

// Instantiate YahooFinance as required by newer versions.
// suppressNotices keeps yahoo-finance2 from printing its one-time survey
// banner to stdout, which would corrupt the MCP stdio JSON-RPC channel.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface FundamentalsArgs {
  /**
   * NSE stock symbol, e.g. "RELIANCE", "TCS", "HDFC".
   * The .NS Yahoo Finance suffix is appended automatically.
   * Pass the full Yahoo symbol to override, e.g. "RELIANCE.NS" or "TCS.BO".
   */
  symbol: string;
}

export interface RecommendationPoint {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface MajorHolders {
  insidersPercentHeld: number | null;
  institutionsPercentHeld: number | null;
  institutionsFloatPercentHeld: number | null;
  institutionsCount: number | null;
}

export interface CashFlowYear {
  fiscalDate: string;
  operating: number | null;
  investing: number | null;
  financing: number | null;
  freeCashFlow: number | null;
}

export interface IncomeStatementRow {
  periodEnd: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebit: number | null;
  ebitda: number | null;
  netIncome: number | null;
  netIncomeCommonStockholders: number | null;
  dilutedEPS: number | null;
}

export interface Fundamentals {
  ticker: string;
  name: string | null;
  currency: string;
  exchange: string | null;
  timestamp: string;
  price: number;
  previousClose: number;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  beta: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  eps: number | null;
  dividendYield: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  grossMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  freeCashflow: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  targetMeanPrice: number | null;
  recommendationMean: number | null;
  recommendationTrend: RecommendationPoint[];
  majorHolders: MajorHolders;
  cashflow: CashFlowYear[];
  incomeStatementQuarterly: IncomeStatementRow[];
  incomeStatementAnnual: IncomeStatementRow[];
}

// NSE symbols are 1-20 uppercase alphanumeric characters (some have & or -).
// After normalising, the Yahoo ticker (with .NS) must pass the broader RE.
const SYMBOL_RE = /^[A-Z0-9&._-]{1,25}$/;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function safeIncomeStatement(
  yf: typeof yahooFinance,
  ticker: string,
  type: "quarterly" | "annual",
): Promise<IncomeStatementRow[]> {
  try {
    const series = await yf.fundamentalsTimeSeries(ticker, {
      module: "financials",
      type,
      period1: type === "annual" ? "2018-01-01" : "2022-01-01",
      period2: "2026-12-31",
    });
    return (Array.isArray(series) ? series : [])
      .map((y: any) => ({
        periodEnd: y?.date ? new Date(y.date).toISOString().slice(0, 10) : "",
        totalRevenue: num(y?.totalRevenue),
        costOfRevenue: num(y?.costOfRevenue),
        grossProfit: num(y?.grossProfit),
        operatingIncome: num(y?.operatingIncome),
        ebit: num(y?.ebit),
        ebitda: num(y?.ebitda),
        netIncome: num(y?.netIncome),
        netIncomeCommonStockholders: num(y?.netIncomeCommonStockholders),
        dilutedEPS: num(y?.dilutedEPS),
      }))
      .filter((r: IncomeStatementRow) => r.periodEnd)
      .sort((a: IncomeStatementRow, b: IncomeStatementRow) => a.periodEnd.localeCompare(b.periodEnd))
      .slice(type === "annual" ? -5 : -8);
  } catch {
    return [];
  }
}

export async function getFundamentals(args: FundamentalsArgs): Promise<Fundamentals> {
  const raw = (args.symbol ?? "").trim();
  if (!raw) throw new Error("symbol is required");

  const upper = raw.toUpperCase();
  // If caller already added an exchange suffix (.NS / .BO) use it as-is;
  // otherwise default to NSE (.NS).
  const ticker = /\.[A-Z]{1,3}$/.test(upper) ? upper : `${upper}.NS`;

  if (!SYMBOL_RE.test(ticker.replace(".NS", "").replace(".BO", ""))) {
    throw new Error(`invalid symbol: ${JSON.stringify(raw)}`);
  }

  // quoteSummary gives fundamentals + recommendation + holders.
  const summary = await yahooFinance.quoteSummary(ticker, {
    modules: [
      "price",
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "recommendationTrend",
      "majorHoldersBreakdown",
    ],
  });

  const price = (summary.price ?? {}) as any;
  const detail = (summary.summaryDetail ?? {}) as any;
  const dks = (summary.defaultKeyStatistics ?? {}) as any;
  const fin = (summary.financialData ?? {}) as any;
  const rec = (summary.recommendationTrend ?? {}) as any;
  const holders = (summary.majorHoldersBreakdown ?? {}) as any;

  // Cash-flow statement history (the quoteSummary cashflow module is deprecated
  // since Nov-2024, so use the dedicated time-series endpoint).
  let cashflow: CashFlowYear[] = [];
  try {
    const cf = await yahooFinance.fundamentalsTimeSeries(ticker, {
      module: "cash-flow",
      type: "annual",
      period1: "2018-01-01",
      period2: "2025-12-31",
    });
    cashflow = (Array.isArray(cf) ? cf : [])
      .map((y: any) => ({
        fiscalDate: y?.date ? new Date(y.date).toISOString().slice(0, 10) : "",
        operating: num(y?.operatingCashFlow),
        investing: num(y?.investingCashFlow),
        financing: num(y?.financingCashFlow),
        freeCashFlow: num(y?.freeCashFlow),
      }))
      .filter((y: CashFlowYear) => y.fiscalDate)
      .sort((a: CashFlowYear, b: CashFlowYear) => a.fiscalDate.localeCompare(b.fiscalDate))
      .slice(-5);
  } catch {
    // Cash-flow is optional; ignore if unavailable.
  }

  const trend: RecommendationPoint[] = Array.isArray(rec.trend)
    ? rec.trend.map((t: any) => ({
        period: t.period ?? "",
        strongBuy: num(t.strongBuy) ?? 0,
        buy: num(t.buy) ?? 0,
        hold: num(t.hold) ?? 0,
        sell: num(t.sell) ?? 0,
        strongSell: num(t.strongSell) ?? 0,
      }))
    : [];

  // Income-statement history (quarterly + annual) via the same time-series
  // endpoint the cash-flow uses. Response fields come back without the
  // annual/quarterly prefix (e.g. totalRevenue, netIncome, dilutedEPS).
  const incomeStatementQuarterly = await safeIncomeStatement(yahooFinance, ticker, "quarterly");
  const incomeStatementAnnual = await safeIncomeStatement(yahooFinance, ticker, "annual");

  const pick = (...vals: unknown[]): number | null => {
    for (const v of vals) {
      const n = num(v);
      if (n !== null) return n;
    }
    return null;
  };

  return {
    ticker,
    name: price.shortName ?? price.longName ?? null,
    currency: price.currency ?? "INR",
    exchange: price.exchange ?? null,
    timestamp: price.regularMarketTime
      ? new Date(price.regularMarketTime).toISOString()
      : new Date().toISOString(),
    price: num(price.regularMarketPrice) ?? 0,
    previousClose: num(price.regularMarketPreviousClose) ?? 0,
    dayHigh: num(price.regularMarketDayHigh),
    dayLow: num(price.regularMarketDayLow),
    fiftyTwoWeekHigh: num(price.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(price.fiftyTwoWeekLow),
    volume: num(price.regularMarketVolume ?? detail.volume),
    averageVolume: num(dks.averageDailyVolume3Month ?? detail.averageVolume),
    marketCap: num(detail.marketCap ?? dks.enterpriseValue),
    beta: pick(dks.beta, fin.beta),
    trailingPE: num(detail.trailingPE ?? dks.trailingPE),
    forwardPE: num(detail.forwardPE ?? dks.forwardPE),
    priceToBook: num(dks.priceToBook),
    eps: num(dks.trailingEps ?? dks.epsTrailingTwelveMonths),
    dividendYield: num(detail.dividendYield),
    profitMargins: pick(fin.profitMargins, dks.profitMargins),
    operatingMargins: pick(fin.operatingMargins, dks.operatingMargins),
    grossMargins: pick(fin.grossMargins, dks.grossMargins),
    returnOnEquity: pick(fin.returnOnEquity, dks.returnOnEquity),
    returnOnAssets: pick(fin.returnOnAssets, dks.returnOnAssets),
    debtToEquity: pick(fin.debtToEquity, dks.debtToEquity),
    currentRatio: pick(fin.currentRatio, dks.currentRatio),
    totalCash: num(fin.totalCash ?? dks.totalCash),
    totalDebt: num(fin.totalDebt ?? dks.totalDebt),
    freeCashflow: num(fin.freeCashflow),
    revenueGrowth: pick(fin.revenueGrowth, dks.revenueGrowth),
    earningsGrowth: pick(fin.earningsGrowth, dks.earningsGrowth),
    targetMeanPrice: num(fin.targetMeanPrice),
    recommendationMean: num(fin.recommendationMean),
    recommendationTrend: trend,
    majorHolders: {
      insidersPercentHeld: num(holders.insidersPercentHeld),
      institutionsPercentHeld: num(holders.institutionsPercentHeld),
      institutionsFloatPercentHeld: num(holders.institutionsFloatPercentHeld),
      institutionsCount: num(holders.institutionsCount),
    },
    cashflow,
    incomeStatementQuarterly,
    incomeStatementAnnual,
  };
}
