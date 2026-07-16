// Bridge layer: imports the already-compiled MCP tool functions from
// ../../dist/tools/*.js and exposes them as plain async helpers the API
// routes (and, indirectly, the UI) can call. The MCP server's source in
// src/ is never modified — we only consume its build output.

import { getStockQuote } from "trade-vision/tools/quote";
import { getBulkDeals } from "trade-vision/tools/bulkDeals";
import { getFiiDiiActivity } from "trade-vision/tools/fiiDiiActivity";
import { getTopGainers } from "trade-vision/tools/topGainers";
import { getTopLosers } from "trade-vision/tools/topLosers";
import { getMarketStatus } from "trade-vision/tools/marketStatus";
import { getFundamentals } from "trade-vision/tools/fundamentals";
import { getTechnicalAnalysis, getPatternAnalysis } from "trade-vision/tools/technical";
import { getPriceHistory } from "trade-vision/tools/priceHistory";
import { runScreener } from "trade-vision/tools/screener";
import { searchBySymbol } from "trade-vision/tools/searchBySymbol";
import { getMostActive } from "trade-vision/tools/mostActive";
import { getAnnouncements } from "trade-vision/tools/announcements";
import { getNiftyIndices } from "trade-vision/tools/indices";
import { getNiftyMovers } from "trade-vision/tools/niftyMovers";
import { getGlobalMarkets } from "trade-vision/tools/globalMarkets";
import { getIpoCalendar, getIpoDetails, getPastIpos, getIpoProspectus } from "trade-vision/tools/ipo";
import { getVixHistory } from "trade-vision/tools/vix";
import { getMarketHolidays } from "trade-vision/tools/holidays";
import {
  getOptionChainTool,
  getOptionExpiries,
  getMaxPainTool,
  getFnoLotsTool,
} from "trade-vision/tools/options";
import { downloadDocument } from "trade-vision/tools/document";
import { getBoardMeetings } from "trade-vision/tools/boardMeetings";
import {
  getBseQuote,
  getBseGainers,
  getBseLosers,
  getBseAdvanceDecline,
  getBseResultCalendar,
} from "trade-vision/tools/bseMarket";
import { getOptionPressure } from "trade-vision/tools/optionPressure";
import { getIvRadar } from "trade-vision/tools/ivRadar";
import { getAiPrediction } from "trade-vision/tools/aiPrediction";
import { getAnalyzeStock } from "trade-vision/tools/analyzeStock";
import { generateStockResearchReport } from "trade-vision/tools/researchReport";
import { getEquityCurves } from "trade-vision/tools/equityCurves";
import { getMonteCarlo } from "trade-vision/tools/monteCarlo";
import { getPretradeRiskScan } from "trade-vision/tools/pretradeRisk";
import { generateStockImages } from "trade-vision/tools/stockImages";

export type { OptionChain, OptionStrike, OptionChainSummary } from "trade-vision/options/optionChain";
export type { VixPoint } from "trade-vision/nse/vix";
export type { MarketHoliday } from "trade-vision/nse/holidays";
export type { IpoProspectus } from "trade-vision/tools/ipo";
export type { DocumentMeta } from "trade-vision/tools/document";
export type { BoardMeeting } from "trade-vision/tools/boardMeetings";
export type { BseQuote, BseMover, BseAdvanceDecline } from "trade-vision/tools/bseMarket";
export type { OptionPressure } from "trade-vision/tools/optionPressure";
export type { IvRadar } from "trade-vision/tools/ivRadar";
export type { AiPrediction } from "trade-vision/tools/aiPrediction";
export type { AnalyzeStock } from "trade-vision/tools/analyzeStock";
export type { ResearchReport } from "trade-vision/tools/researchReport";
export type { EquityCurvesResult } from "trade-vision/tools/equityCurves";
export type { MonteCarloResult } from "trade-vision/tools/monteCarlo";
export type { PretradeRiskScan } from "trade-vision/tools/pretradeRisk";
export type { StockImagesResult } from "trade-vision/tools/stockImages";
export type { ModelVote } from "trade-vision/tools/aiPrediction";
export type { Verdict } from "trade-vision/tools/analyzeStock";
export type { EquityMetrics } from "trade-vision/tools/equityCurves";

// ---- Types (mirror src/types.ts so the web layer is self-contained) ----
export interface BulkDeal {
  date: string;
  symbol: string;
  name: string;
  clientName: string;
  dealType: "BUY" | "SELL";
  quantity: number;
  price: number;
}

export interface FiiDiiActivity {
  date: string;
  fiiBuyValue: number;
  fiiSellValue: number;
  fiiNetValue: number;
  diiBuyValue: number;
  diiSellValue: number;
  diiNetValue: number;
}

export interface NseStock {
  symbol: string;
  series: string;
  open: number;
  dayHigh: number;
  dayLow: number;
  lastPrice: number;
  previousClose: number;
  change: number;
  pChange: number;
  totalTradedVolume: number;
  totalTradedValue: number;
  yearHigh: number;
  yearLow: number;
  perChange365d: number;
}

export interface NseIndex {
  key: string;
  name: string;
  lastPrice: number;
  variation: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  advances: number;
  declines: number;
  unchanged: number;
}

export interface NseAnnouncement {
  symbol: string;
  company: string;
  description: string;
  broadcastDateTime: string;
  pdfLink?: string;
}

export interface NiftyMover {
  symbol: string;
  lastPrice: number;
  pChange: number;
  weight: number;
}

export interface NiftyMoversResult {
  gainers: NiftyMover[];
  losers: NiftyMover[];
  asOf: string;
  fallbackWeights: boolean;
}

export interface GlobalIndex {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface MarketStatusItem {
  market: string;
  marketStatus: string;
  tradeDate: string;
  index: string;
  last: number;
  variation: number;
  percentChange: number;
  marketStatusMessage: string;
}

export interface Quote {
  ticker: string;
  name: string | null;
  exchange: string | null;
  currency: string;
  timestamp: string;
  price: number;
  previousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  averageVolume: number | null;
  marketCap: number | null;
  beta: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  exDividendDate: string | null;
  earningsDate: string | null;
}

export type DealType = "BUY" | "SELL" | "ALL";

export interface Result<T> {
  data?: T;
  error?: string;
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

export type TechSignal = { name: string; value: string; signal: "BUY" | "SELL" | "NEUTRAL" };
export interface TechnicalSummary {
  label: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
  score: number;
  buy: number;
  neutral: number;
  sell: number;
}
export interface Technical {
  symbol: string;
  price: number;
  summary: TechnicalSummary;
  oscillators: TechSignal[];
  movingAverages: TechSignal[];
  volatility: { atr: number; bbWidth: number; histVol: number };
  patterns: { name: string; type: "BULLISH" | "BEARISH" | "NEUTRAL" }[];
  generatedAt: string;
}

export type PatternConfidence = "HIGH" | "MEDIUM" | "LOW";
export type PatternType = "BULLISH" | "BEARISH" | "NEUTRAL";
export interface DetectedPattern {
  name: string;
  type: PatternType;
  note: string;
  forming: boolean;
  confidence?: PatternConfidence;
}
export type PatternHorizon = "intraday" | "short" | "long";
export interface PatternAnalysisRow {
  horizon: PatternHorizon;
  label: string;
  interval: string;
  bars: number;
  patterns: DetectedPattern[];
}
export type PatternAnalysis = PatternAnalysisRow[];

// ---- IPO types (mirror src/ipo/types.ts) ----
export interface IpoSubscription {
  qib: number | null;
  nii: number | null;
  retail: number | null;
  total: number | null;
}

export interface IpoFinancials {
  revenue: number | null;
  pat: number | null;
  eps: number | null;
  peRatio: number | null;
  industryPe: number | null;
  roe: number | null;
  debtEquity: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
}

export type IpoSignalVerdict = "APPLY" | "SKIP" | "WATCH";

export interface IpoSignalCheck {
  id: string;
  label: string;
  weight: number;
  status: "PASS" | "WARN" | "FAIL";
  points: number;
  note: string;
}

export interface IpoSignal {
  signal: IpoSignalVerdict;
  score: number;
  maxScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  checks: IpoSignalCheck[];
  reasons: string[];
  disclaimer: string;
}

export interface IpoPriceBand {
  min: number;
  max: number;
  kind: "BAND" | "FIXED";
  raw: string;
}

export interface Ipo {
  companyName: string;
  symbol: string | null;
  isin: string | null;
  exchange: string;
  type: "Mainline" | "SME";
  issueType: string | null;
  priceBand: IpoPriceBand | null;
  issueSizeCr: number | null;
  lotSize: number | null;
  faceValue: number | null;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  allotmentDate: string | null;
  gmp: number | null;
  gmpPercent: number | null;
  gmpAsOf: string | null;
  subscription: IpoSubscription | null;
  financials: IpoFinancials | null;
  drhpLink: string | null;
  dataSource: string;
}

export type IpoWithSignal = Ipo & { signal: IpoSignal };

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

async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export const mcp = {
  quote: (symbol: string) => safe(() => getStockQuote({ symbol })),
  bulkDeals: (symbol?: string, dealType: DealType = "ALL") =>
    safe(() => getBulkDeals({ symbol, dealType })),
  fiiDii: (limit = 10) => safe(() => getFiiDiiActivity({ limit })),
  topGainers: (limit = 10) => safe(() => getTopGainers({ limit })),
  topLosers: (limit = 10) => safe(() => getTopLosers({ limit })),
  marketStatus: () => safe(() => getMarketStatus()),
  fundamentals: (symbol: string) => safe(() => getFundamentals({ symbol })),
  technical: (symbol: string) => safe(() => getTechnicalAnalysis({ symbol })),
  patternAnalysis: (symbol: string) => safe(() => getPatternAnalysis({ symbol })),
  searchBySymbol: (symbol: string, daysBack = 30) =>
    safe(() => searchBySymbol({ symbol, daysBack })),
  mostActive: (limit = 10, index?: string) =>
    safe(() => getMostActive({ limit, index })),
  announcements: (limit = 20, daysBack?: number) =>
    safe(() => getAnnouncements({ limit, daysBack })),
  niftyIndices: (name?: string) => safe(() => getNiftyIndices({ name })),
  niftyMovers: (limit = 8) => safe(() => getNiftyMovers({ limit })),
  globalMarkets: () => safe(() => getGlobalMarkets()),
  ipoCalendar: (status?: string, exchange?: string, limit = 20) =>
    safe(() => getIpoCalendar({ status, exchange, limit })),
  ipoDetails: (symbol?: string, companyName?: string) =>
    safe(() => getIpoDetails({ symbol, companyName })),
  pastIpos: (from?: string, to?: string, limit = 50) =>
    safe(() => getPastIpos({ from, to, limit })),
  ipoProspectus: (symbol: string) => safe(() => getIpoProspectus(symbol)),
  vixHistory: (from?: string, to?: string) => safe(() => getVixHistory({ from, to })),
  marketHolidays: (year?: number) => safe(() => getMarketHolidays({ year })),
  optionChain: (symbol: string, expiry?: string) =>
    safe(() => getOptionChainTool({ symbol, expiry })),
  optionExpiries: (symbol: string) => safe(() => getOptionExpiries({ symbol })),
  maxPain: (symbol: string, expiry?: string) =>
    safe(() => getMaxPainTool({ symbol, expiry })),
  fnoLots: (symbol: string) => safe(() => getFnoLotsTool({ symbol })),
  downloadDocument: (url: string) => safe(() => downloadDocument(url)),
  boardMeetings: (symbol?: string) => safe(() => getBoardMeetings({ symbol })),
  bseQuote: (scrip: string) => safe(() => getBseQuote(scrip)),
  bseGainers: () => safe(() => getBseGainers()),
  bseLosers: () => safe(() => getBseLosers()),
  bseBreadth: () => safe(() => getBseAdvanceDecline()),
  bseResultCalendar: () => safe(() => getBseResultCalendar()),
  screener: (args: Record<string, unknown> = {}) =>
    safe(() => runScreener(args as any)),
  priceHistory: (symbol: string, range = "3M") =>
    safe(() => getPriceHistory({ symbol, range })),
  optionPressure: (symbol: string, expiry?: string) =>
    safe(() => getOptionPressure({ symbol, expiry })),
  ivRadar: (symbol: string, expiry?: string) =>
    safe(() => getIvRadar({ symbol, expiry })),
  aiPrediction: (symbol: string) => safe(() => getAiPrediction({ symbol })),
  analyzeStock: (symbol: string) => safe(() => getAnalyzeStock({ symbol })),
  researchReport: (symbol: string) =>
    safe(() => generateStockResearchReport({ symbol })),
  equityCurves: (symbol: string, windowDays?: number) =>
    safe(() => getEquityCurves({ symbol, windowDays })),
  monteCarlo: (
    symbol: string,
    horizonDays?: number,
    paths?: number,
    historicalDays?: number,
  ) =>
    safe(() =>
      getMonteCarlo({ symbol, horizonDays, paths, historicalDays }),
    ),
  pretradeRisk: (
    symbol: string,
    entryPrice?: number,
    riskRupees?: number,
    stopMultiple?: number,
  ) =>
    safe(() =>
      getPretradeRiskScan({ symbol, entryPrice, riskRupees, stopMultiple }),
    ),
  stockImages: (symbol: string, bars?: number) =>
    safe(() => generateStockImages({ symbol, bars })),
};
