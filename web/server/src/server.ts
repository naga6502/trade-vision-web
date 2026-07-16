import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getBulkDeals } from "./tools/bulkDeals.js";
import { getBlockDeals } from "./tools/blockDeals.js";
import { getInsiderTrading } from "./tools/insiderTrading.js";
import { getLatestBulkDeals } from "./tools/latestBulkDeals.js";
import { getTopBulkBuys } from "./tools/topBulkBuys.js";
import { getTopBulkSells } from "./tools/topBulkSells.js";
import { getFiiDiiActivity } from "./tools/fiiDiiActivity.js";
import { getAnnouncements } from "./tools/announcements.js";
import { getMarketStatus } from "./tools/marketStatus.js";
import { getNiftyIndices } from "./tools/indices.js";
import { getTopGainers } from "./tools/topGainers.js";
import { getTopLosers } from "./tools/topLosers.js";
import { getMostActive } from "./tools/mostActive.js";
import { searchBySymbol } from "./tools/searchBySymbol.js";
import { getStockQuote } from "./tools/quote.js";
import { getFundamentals } from "./tools/fundamentals.js";
import { getTechnicalAnalysis, getPatternAnalysis } from "./tools/technical.js";
import { runScreener, getScreenerRegistry } from "./tools/screener.js";
import { getShortSelling } from "./tools/shortSelling.js";
import { getCorporateActions } from "./tools/corporateActions.js";
import { getIpoCalendar, getIpoDetails, getPastIpos, getIpoProspectus } from "./tools/ipo.js";
import { getVixHistory } from "./tools/vix.js";
import { getMarketHolidays } from "./tools/holidays.js";
import {
  getOptionChainTool,
  getOptionExpiries,
  getMaxPainTool,
  getFnoLotsTool,
} from "./tools/options.js";
import { downloadDocument } from "./tools/document.js";
import { getBoardMeetings } from "./tools/boardMeetings.js";
import {
  getBseQuote,
  getBseGainers,
  getBseLosers,
  getBseAdvanceDecline,
  getBseResultCalendar,
} from "./tools/bseMarket.js";
import { getAiPrediction } from "./tools/aiPrediction.js";
import { getIvRadar } from "./tools/ivRadar.js";
import { getOptionPressure } from "./tools/optionPressure.js";
import { getMonteCarlo } from "./tools/monteCarlo.js";
import { getEquityCurves } from "./tools/equityCurves.js";
import { getPretradeRiskScan } from "./tools/pretradeRisk.js";
import { generateStockImages } from "./tools/stockImages.js";
import { generateStockResearchReport } from "./tools/researchReport.js";
import { getAnalyzeStock } from "./tools/analyzeStock.js";

export function createMcpServer(): Server {
  const server = new Server(
    { name: "trade-vision", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  // -------------------------------------------------------------------------
  // Tool definitions
  // -------------------------------------------------------------------------

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_bulk_deals",
        description:
          "Fetch today's NSE bulk deals — trades where a single client buys or sells ≥0.5% of a company's listed shares in one session. Returns the buyer/seller, quantity, and weighted-average price.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Filter by NSE symbol (e.g. RELIANCE). Omit for all symbols.",
            },
            dealType: {
              type: "string",
              enum: ["BUY", "SELL", "ALL"],
              description: "Filter by deal direction. Default: ALL.",
            },
          },
        },
      },
      {
        name: "get_block_deals",
        description:
          "Fetch today's NSE block deals — large negotiated trades (minimum ₹10 crore) executed in the Block Deal Window. Shows counterparty, quantity, and trade price.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Filter by NSE symbol. Omit for all symbols.",
            },
            dealType: {
              type: "string",
              enum: ["BUY", "SELL", "ALL"],
              description: "Filter by deal direction. Default: ALL.",
            },
          },
        },
      },
      {
        name: "get_insider_trading",
        description:
          "Fetch SEBI PIT (Prohibition of Insider Trading) disclosures — promoter and insider buy/sell transactions reported to the exchanges. Shows acquirer name, category, shares before/after, and mode of acquisition.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Filter by NSE symbol. Omit for all companies.",
            },
            fromDate: {
              type: "string",
              description: "Start date in YYYY-MM-DD format. Default: 30 days ago.",
            },
            toDate: {
              type: "string",
              description: "End date in YYYY-MM-DD format. Default: today.",
            },
          },
        },
      },
      {
        name: "get_latest_bulk_deals",
        description:
          "Convenience wrapper — returns today's bulk deals sorted by trade value, optionally filtered by direction.",
        inputSchema: {
          type: "object",
          properties: {
            dealType: {
              type: "string",
              enum: ["BUY", "SELL", "ALL"],
              description: "Filter by deal direction. Default: ALL.",
            },
          },
        },
      },
      {
        name: "get_top_bulk_buys",
        description:
          "Today's largest bulk-deal purchases ranked by total trade value (quantity × price). Useful for spotting institutional accumulation.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of results to return. Default: 10.",
            },
            symbol: {
              type: "string",
              description: "Restrict to a single NSE symbol.",
            },
          },
        },
      },
      {
        name: "get_top_bulk_sells",
        description:
          "Today's largest bulk-deal sales ranked by total trade value. Useful for spotting institutional distribution.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of results to return. Default: 10.",
            },
            symbol: {
              type: "string",
              description: "Restrict to a single NSE symbol.",
            },
          },
        },
      },
      {
        name: "get_fii_dii_activity",
        description:
          "Daily FII (Foreign Institutional Investor) and DII (Domestic Institutional Investor) net buy/sell figures in the Indian cash market. Key macro signal for market direction.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent trading days to return. Default: 10.",
            },
          },
        },
      },
      {
        name: "get_nse_announcements",
        description:
          "Corporate announcements filed with NSE — board meetings, results, dividends, mergers, regulatory updates, etc. Equivalent to 8-K filings on SEC EDGAR.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Filter by NSE symbol. Omit for all companies.",
            },
            daysBack: {
              type: "number",
              description: "Return announcements from the last N days. Omit for no date filter.",
            },
            limit: {
              type: "number",
              description: "Maximum number of results. Default: 20.",
            },
          },
        },
      },
      {
        name: "get_market_status",
        description:
          "Current NSE market status — whether Capital Market, F&O, Currency Derivatives, and Commodity segments are open or closed, plus live index levels.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_nifty_indices",
        description:
          "Live data for all NSE indices (Nifty 50, Nifty Bank, Nifty IT, Nifty Midcap 150, etc.) — price, change, 52-week range, advances/declines.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Filter by index name (partial, case-insensitive). E.g. \"BANK\" returns all bank indices.",
            },
          },
        },
      },
      {
        name: "get_top_gainers",
        description:
          "Top gaining NSE stocks by percentage change for the current session within a given index.",
        inputSchema: {
          type: "object",
          properties: {
            index: {
              type: "string",
              description:
                "Market segment to scan. Maps to an NSE category (NIFTY, BANKNIFTY, NIFTYNEXT50, FOSec). Default: all securities.",
            },
            limit: {
              type: "number",
              description: "Number of results to return. Default: 10.",
            },
          },
        },
      },
      {
        name: "get_top_losers",
        description:
          "Top losing NSE stocks by percentage change for the current session within a given index.",
        inputSchema: {
          type: "object",
          properties: {
            index: {
              type: "string",
              description:
                "Market segment to scan. Maps to an NSE category (NIFTY, BANKNIFTY, NIFTYNEXT50, FOSec). Default: all securities.",
            },
            limit: {
              type: "number",
              description: "Number of results to return. Default: 10.",
            },
          },
        },
      },
      {
        name: "get_most_active",
        description:
          "Most actively traded NSE stocks by total traded value (₹) in the current session.",
        inputSchema: {
          type: "object",
          properties: {
            index: {
              type: "string",
              description: "NSE index to scan. Default: \"NIFTY 500\".",
            },
            limit: {
              type: "number",
              description: "Number of results to return. Default: 10.",
            },
          },
        },
      },
      {
        name: "search_by_symbol",
        description:
          "Aggregate view for a single NSE stock — returns today's bulk deals, block deals, recent insider trades, and recent announcements in one call.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "NSE stock symbol (e.g. RELIANCE, TCS, HDFC). Required.",
            },
            daysBack: {
              type: "number",
              description:
                "How many days back to look for insider trades and announcements. Default: 30.",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_quote",
        description:
          "Live stock quote from Yahoo Finance for any NSE-listed stock. Includes price, 52-week range, volume, market cap, P/E ratios, dividend yield, and next earnings date. Prices are in INR.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description:
                "NSE symbol (e.g. RELIANCE, TCS). The .NS exchange suffix is appended automatically. Pass RELIANCE.BO to query BSE instead.",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_fundamentals",
        description:
          "Deep fundamentals for an NSE-listed stock via Yahoo Finance: valuation (P/E, P/B, market cap, dividend yield, EPS, beta), profitability (gross/operating/profit margins, ROE, ROA), leverage (debt/equity, current ratio, cash, debt), analyst consensus (recommendation mean + trend + mean target price), major holders (insiders %, institutions %, count), and 5-year annual cash-flow statement (operating/investing/financing/free).",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description:
                "NSE symbol (e.g. RELIANCE, TCS). The .NS exchange suffix is appended automatically. Pass RELIANCE.BO to query BSE instead.",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_technical_analysis",
        description:
          "Native technical analysis for an NSE-listed stock, computed from Yahoo Finance historical data — no external widget. Returns a Summary recommendation (Strong Buy → Strong Sell) plus Oscillators (RSI, Stochastic %K, MACD, ADX, Williams %R) and Moving Averages (SMA/EMA 10/20/50/100/200), each with a BUY/SELL/NEUTRAL signal.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description:
                "NSE symbol (e.g. RELIANCE, TCS). The .NS exchange suffix is appended automatically. Pass RELIANCE.BO to query BSE instead.",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_pattern_analysis",
        description:
          "Multi-timeframe chart-pattern analysis for an NSE-listed stock, computed from Yahoo Finance data across three horizons: intraday (15-minute bars), short-term (daily, ~3 months) and long-term (daily, ~1 year). Detects classic formations — Double Top/Bottom, Head & Shoulders / Inverse H&S, Ascending/Descending/Symmetrical Triangles, Bull/Bear Flags, Rising/Falling Wedges, Cup & Handle, and Rectangle ranges — plus the latest candlestick patterns. Each detection carries a bullish/bearish/neutral read, a forming flag (true when the structure is still developing on the live bar), and a confidence level with a trader-style note naming the breakout levels and measured targets.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description:
                "NSE symbol (e.g. RELIANCE, TCS). The .NS exchange suffix is appended automatically. Pass RELIANCE.BO to query BSE instead.",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_stock_screener",
        description:
          "Technical screener catalog and scoring engine for NSE stocks. Supports momentum, breakout, intraday, swing, mean-reversion, volatility, sector-rotation, and accumulation-style screens. Returns a ranked list of candidates with a trader-style reason and supporting signal context.",
        inputSchema: {
          type: "object",
          properties: {
            screenType: {
              type: "string",
              enum: [
                "momentum",
                "breakout",
                "intraday",
                "swing",
                "mean-reversion",
                "volatility",
                "sector-rotation",
                "accumulation",
                "all",
              ],
              description: "Which screener style to evaluate. Default: all.",
            },
            symbols: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of NSE symbols to evaluate.",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return. Default: 20.",
            },
            sector: {
              type: "string",
              description: "Optional sector filter for the screen candidates.",
            },
            minVolume: {
              type: "number",
              description: "Optional minimum volume threshold used by the screening logic.",
            },
          },
        },
      },
      {
        name: "get_short_selling",
        description:
          "NSE short-selling data — quantity of shares sold short and second-leg (covering) quantities, as reported by brokers under SEBI's short-selling framework.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Filter by NSE symbol. Omit for all stocks.",
            },
            limit: {
              type: "number",
              description:
                "Return top N stocks by short-sold quantity. Omit for all.",
            },
          },
        },
      },
      {
        name: "get_corporate_actions",
        description:
          "Upcoming and recent corporate actions — dividends, stock splits, bonus issues, rights issues, and buy-backs. Shows ex-date, record date, and payment date.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Filter by NSE symbol. Omit for all companies.",
            },
            fromDate: {
              type: "string",
              description: "Start date in YYYY-MM-DD format. Default: 3 months ago.",
            },
            toDate: {
              type: "string",
              description: "End date in YYYY-MM-DD format. Default: today.",
            },
          },
        },
      },
      {
        name: "get_ipo_calendar",
        description:
          "List NSE/BSE IPOs with grey-market premium, subscription multiples, issuer financials and an Apply/Skip/Watch signal. Status: current (open now), upcoming, latest (recently closed), closed, or all. Each row carries the computed signal + reasons.",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["current", "upcoming", "latest", "closed", "all"],
              description: "IPO window to list. Default: current.",
            },
            exchange: {
              type: "string",
              description: "Filter by exchange (e.g. NSE, BSE, ALL). Omit for all.",
            },
            limit: {
              type: "number",
              description: "Maximum number of IPOs to return. Default: 20.",
            },
          },
        },
      },
      {
        name: "get_ipo_details",
        description:
          "Full detail for a single IPO — price band, issue size, lot size, GMP, subscription by category (QIB/NII/retail), issuer financials, key dates, and the weighted Apply/Skip/Watch signal with every contributing check and reason. Identify the IPO by symbol or company name.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "NSE/BSE symbol (e.g. RELIANCE). Omit if using companyName.",
            },
            companyName: {
              type: "string",
              description: "Issuer company name (e.g. 'Tata Technologies'). Omit if using symbol.",
            },
          },
        },
      },
      {
        name: "get_past_ipos",
        description:
          "Past NSE/BSE IPOs within an optional date window (filters latest + closed listings by listing/close date). Returns the same enriched Apply/Skip/Watch records as the calendar.",
        inputSchema: {
          type: "object",
          properties: {
            from: { type: "string", description: "Start date YYYY-MM-DD. Omit for no lower bound." },
            to: { type: "string", description: "End date YYYY-MM-DD. Omit for no upper bound." },
            limit: { type: "number", description: "Maximum IPOs to return. Default: 50." },
          },
        },
      },
      {
        name: "get_ipo_prospectus",
        description:
          "Best-effort DRHP/RHP prospectus links for an IPO by scanning NSE's IPO detail payload for .pdf URLs.",
        inputSchema: {
          type: "object",
          properties: { symbol: { type: "string", description: "NSE/BSE IPO symbol." } },
          required: ["symbol"],
        },
      },
      {
        name: "get_vix_history",
        description:
          "Historical India VIX (volatility index) daily closes between two dates. Useful for regime/fear context.",
        inputSchema: {
          type: "object",
          properties: {
            from: { type: "string", description: "Start date YYYY-MM-DD. Default: 1 year ago." },
            to: { type: "string", description: "End date YYYY-MM-DD. Default: today." },
          },
        },
      },
      {
        name: "get_market_holidays",
        description: "NSE trading/settlement holidays for a calendar year, by market segment (CM, FO, CD, ...).",
        inputSchema: {
          type: "object",
          properties: { year: { type: "number", description: "Calendar year. Default: current year." } },
        },
      },
      {
        name: "get_option_chain",
        description:
          "Full NSE option chain for a symbol with computed analytics — total CE/PE OI, PCR (put-call ratio), max pain, and per-strike OI. Option-chain section needs browser-like headers + cookie priming.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol, e.g. RELIANCE." },
            expiry: { type: "string", description: "Expiry date (from get_option_expiries). Defaults to nearest." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_option_expiries",
        description: "Available NSE option-chain expiry dates for a symbol.",
        inputSchema: {
          type: "object",
          properties: { symbol: { type: "string", description: "NSE symbol, e.g. RELIANCE." } },
          required: ["symbol"],
        },
      },
      {
        name: "get_max_pain",
        description: "Max pain strike for a symbol's option chain (the strike where option writers' aggregate losses are minimised).",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol, e.g. RELIANCE." },
            expiry: { type: "string", description: "Expiry date. Defaults to nearest." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_fno_lots",
        description: "F&O lot size for a symbol (read from the option-chain record when available).",
        inputSchema: {
          type: "object",
          properties: { symbol: { type: "string", description: "NSE symbol." } },
          required: ["symbol"],
        },
      },
      {
        name: "download_document",
        description:
          "Fetch a document (DRHP, RHP, circular, report) and return metadata — content-type, a text snippet for inline payloads, or a link for binary (PDF) files. Caller supplies the URL.",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string", description: "Absolute document URL." } },
          required: ["url"],
        },
      },
      {
        name: "get_board_meetings",
        description: "Upcoming board meetings (purpose, date) for all companies or a single symbol. VERIFY endpoint on first live run.",
        inputSchema: {
          type: "object",
          properties: { symbol: { type: "string", description: "Filter by NSE symbol. Omit for all." } },
        },
      },
      {
        name: "get_bse_quote",
        description: "Real-time BSE quote by scrip code. VERIFY endpoint on first live run (BSE blocks programmatic access from some networks).",
        inputSchema: {
          type: "object",
          properties: { scrip: { type: "string", description: "BSE scrip code, e.g. 500325." } },
          required: ["scrip"],
        },
      },
      {
        name: "get_bse_gainers",
        description: "Top BSE gainers. VERIFY endpoint on first live run.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_bse_losers",
        description: "Top BSE losers. VERIFY endpoint on first live run.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_bse_advance_decline",
        description: "BSE advance/decline breadth per index. VERIFY endpoint on first live run.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_bse_result_calendar",
        description: "BSE corporate result calendar. VERIFY endpoint on first live run.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_ai_prediction",
        description:
          "Next-session directional bias for an NSE stock — a transparent weighted ensemble of technical structure, momentum oscillators, chart patterns, FII flow, and the volatility regime. Returns prediction (UP/DOWN/FLAT), up_probability, confidence, signal_strength, regime, and the per-model votes. NOTE: heuristic quant ensemble computed from Yahoo + NSE data, not a trained ML model.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE). .NS appended automatically." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_iv_radar",
        description:
          "Implied-volatility analytics for an NSE F&O stock from the live option chain + realised-vol history: ATM IV, IV rank & percentile (realised-vol proxy), risk reversal, and the volatility regime (ELEVATED/NORMAL/COMPRESSED).",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE F&O symbol (e.g. RELIANCE)." },
            expiry: { type: "string", description: "Expiry date (from get_option_expiries). Defaults to nearest." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_option_pressure",
        description:
          "Options positioning & dealer-hedging pressure for an NSE F&O stock: max pain, gamma wall (OI-weighted approximation), expected move (straddle), squeeze targets, and call-resistance / put-support pressure zones.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE F&O symbol (e.g. RELIANCE)." },
            expiry: { type: "string", description: "Expiry date (from get_option_expiries). Defaults to nearest." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_monte_carlo",
        description:
          "Geometric-Brownian-motion Monte Carlo of the future price (default 10,000 paths over 30 trading days) estimated from trailing daily returns. Returns mean/median price, 68% and 90% ranges, probability above spot, probability of a 10% drop, and a terminal-price distribution.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE)." },
            horizonDays: { type: "number", description: "Forecast horizon in trading days. Default: 30." },
            paths: { type: "number", description: "Number of simulated paths. Default: 10000." },
            historicalDays: { type: "number", description: "Trailing window (days) for drift/vol estimate. Default: 365." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_equity_curves",
        description:
          "Native backtest of long-only strategies over trailing daily bars (buy & hold, SMA 50/200 cross, RSI 14 mean-reversion, MACD 12/26/9 cross). Returns cumulative/CAGR return, Sharpe, Sortino, max drawdown, win rate, and trade count per strategy.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE)." },
            windowDays: { type: "number", description: "Trailing window (days) for the backtest. Default: 365." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_pretrade_risk_scan",
        description:
          "Pre-trade risk scan for a single NSE stock: liquidity score, ATR volatility, suggested stop-loss, position sizing from a risk budget, gap risk, earnings proximity, implied move, and a PROCEED / REDUCE_SIZE / AVOID recommendation with flags.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE)." },
            entryPrice: { type: "number", description: "Planned entry price. Defaults to current price." },
            riskRupees: { type: "number", description: "Capital (₹) you will risk on the trade. Default: 25000." },
            stopMultiple: { type: "number", description: "Stop distance in ATR units. Default: 2." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "generate_stock_images",
        description:
          "Generate three native SVG charts for a symbol — candlestick price, implied-volatility-by-strike, and an options-flow (OI) heatmap — written to a local charts/ directory. Returns the file paths and the inline SVG markup.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE)." },
            bars: { type: "number", description: "Trailing daily bars for the candlestick chart. Default: 60." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "generate_stock_research_report",
        description:
          "Structured markdown research note synthesising quote, technicals, chart patterns, options/volatility, the AI read, Monte Carlo, backtest, fundamentals, and the aggregate verdict into one report.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE)." },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_analyze_stock",
        description:
          "Institutional-style aggregate verdict for an NSE stock: combines the AI directional read, IV radar, option pressure, Monte Carlo, and backtest into a STRONG BUY → STRONG SELL signal with a confidence score and the supporting bullish/bearish factors.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "NSE symbol (e.g. RELIANCE)." },
          },
          required: ["symbol"],
        },
      },
    ],
  }));

  // -------------------------------------------------------------------------
  // Tool dispatch
  // -------------------------------------------------------------------------

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const a = (args ?? {}) as Record<string, unknown>;

    function str(key: string): string | undefined {
      const v = a[key];
      return typeof v === "string" ? v : undefined;
    }
    function num(key: string): number | undefined {
      const v = a[key];
      return typeof v === "number" ? v : undefined;
    }
    function strEnum<T extends string>(key: string): T | undefined {
      const v = a[key];
      return typeof v === "string" ? (v as T) : undefined;
    }

    try {
      let result: unknown;

      switch (name) {
        case "get_bulk_deals":
          result = await getBulkDeals({
            symbol: str("symbol"),
            dealType: strEnum<"BUY" | "SELL" | "ALL">("dealType"),
          });
          break;

        case "get_block_deals":
          result = await getBlockDeals({
            symbol: str("symbol"),
            dealType: strEnum<"BUY" | "SELL" | "ALL">("dealType"),
          });
          break;

        case "get_insider_trading":
          result = await getInsiderTrading({
            symbol: str("symbol"),
            fromDate: str("fromDate"),
            toDate: str("toDate"),
          });
          break;

        case "get_latest_bulk_deals":
          result = await getLatestBulkDeals({
            dealType: strEnum<"BUY" | "SELL" | "ALL">("dealType"),
          });
          break;

        case "get_top_bulk_buys":
          result = await getTopBulkBuys({ limit: num("limit"), symbol: str("symbol") });
          break;

        case "get_top_bulk_sells":
          result = await getTopBulkSells({ limit: num("limit"), symbol: str("symbol") });
          break;

        case "get_fii_dii_activity":
          result = await getFiiDiiActivity({ limit: num("limit") });
          break;

        case "get_nse_announcements":
          result = await getAnnouncements({
            symbol: str("symbol"),
            daysBack: num("daysBack"),
            limit: num("limit"),
          });
          break;

        case "get_market_status":
          result = await getMarketStatus();
          break;

        case "get_nifty_indices":
          result = await getNiftyIndices({ name: str("name") });
          break;

        case "get_top_gainers":
          result = await getTopGainers({ index: str("index"), limit: num("limit") });
          break;

        case "get_top_losers":
          result = await getTopLosers({ index: str("index"), limit: num("limit") });
          break;

        case "get_most_active":
          result = await getMostActive({ index: str("index"), limit: num("limit") });
          break;

        case "search_by_symbol": {
          const symbol = str("symbol");
          if (!symbol) throw new Error("symbol is required");
          result = await searchBySymbol({ symbol, daysBack: num("daysBack") });
          break;
        }

        case "get_quote": {
          const symbol = str("symbol");
          if (!symbol) throw new Error("symbol is required");
          result = await getStockQuote({ symbol });
          break;
        }

        case "get_fundamentals": {
          const symbol = str("symbol");
          if (!symbol) throw new Error("symbol is required");
          result = await getFundamentals({ symbol });
          break;
        }

        case "get_technical_analysis": {
          const symbol = str("symbol");
          if (!symbol) throw new Error("symbol is required");
          result = await getTechnicalAnalysis({ symbol });
          break;
        }

        case "get_pattern_analysis": {
          const symbol = str("symbol");
          if (!symbol) throw new Error("symbol is required");
          result = await getPatternAnalysis({ symbol });
          break;
        }

        case "get_stock_screener": {
          const symbols = Array.isArray(a.symbols)
            ? (a.symbols as unknown[]).filter((item): item is string => typeof item === "string")
            : undefined;
          result = {
            registry: getScreenerRegistry(),
            output: await runScreener({
              screenType: strEnum<
                | "momentum"
                | "breakout"
                | "intraday"
                | "swing"
                | "mean-reversion"
                | "volatility"
                | "sector-rotation"
                | "accumulation"
                | "all"
              >("screenType"),
              symbols,
              limit: num("limit"),
              sector: str("sector"),
              minVolume: num("minVolume"),
            }),
          };
          break;
        }

        case "get_short_selling":
          result = await getShortSelling({ symbol: str("symbol"), limit: num("limit") });
          break;

        case "get_corporate_actions":
          result = await getCorporateActions({
            symbol: str("symbol"),
            fromDate: str("fromDate"),
            toDate: str("toDate"),
          });
          break;

        case "get_ipo_calendar":
          result = await getIpoCalendar({
            status: strEnum<"current" | "upcoming" | "latest" | "closed" | "all">("status"),
            exchange: str("exchange"),
            limit: num("limit"),
          });
          break;

        case "get_ipo_details":
          result = await getIpoDetails({
            symbol: str("symbol"),
            companyName: str("companyName"),
          });
          break;

        case "get_past_ipos":
          result = await getPastIpos({
            from: str("from"),
            to: str("to"),
            limit: num("limit"),
          });
          break;

        case "get_ipo_prospectus": {
          const psym = str("symbol");
          if (!psym) throw new Error("symbol is required");
          result = await getIpoProspectus(psym);
          break;
        }

        case "get_vix_history":
          result = await getVixHistory({ from: str("from"), to: str("to") });
          break;

        case "get_market_holidays":
          result = await getMarketHolidays({ year: num("year") });
          break;

        case "get_option_chain": {
          const osym = str("symbol");
          if (!osym) throw new Error("symbol is required");
          result = await getOptionChainTool({ symbol: osym, expiry: str("expiry") });
          break;
        }

        case "get_option_expiries": {
          const osym = str("symbol");
          if (!osym) throw new Error("symbol is required");
          result = await getOptionExpiries({ symbol: osym });
          break;
        }

        case "get_max_pain": {
          const osym = str("symbol");
          if (!osym) throw new Error("symbol is required");
          result = await getMaxPainTool({ symbol: osym, expiry: str("expiry") });
          break;
        }

        case "get_fno_lots": {
          const osym = str("symbol");
          if (!osym) throw new Error("symbol is required");
          result = await getFnoLotsTool({ symbol: osym });
          break;
        }

        case "download_document": {
          const url = str("url");
          if (!url) throw new Error("url is required");
          result = await downloadDocument(url);
          break;
        }

        case "get_board_meetings":
          result = await getBoardMeetings({ symbol: str("symbol") });
          break;

        case "get_bse_quote": {
          const scrip = str("scrip");
          if (!scrip) throw new Error("scrip is required");
          result = await getBseQuote(scrip);
          break;
        }

        case "get_bse_gainers":
          result = await getBseGainers();
          break;

        case "get_bse_losers":
          result = await getBseLosers();
          break;

        case "get_bse_advance_decline":
          result = await getBseAdvanceDecline();
          break;

        case "get_bse_result_calendar":
          result = await getBseResultCalendar();
          break;

        case "get_ai_prediction": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getAiPrediction({ symbol: sym });
          break;
        }

        case "get_iv_radar": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getIvRadar({ symbol: sym, expiry: str("expiry") });
          break;
        }

        case "get_option_pressure": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getOptionPressure({ symbol: sym, expiry: str("expiry") });
          break;
        }

        case "get_monte_carlo": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getMonteCarlo({
            symbol: sym,
            horizonDays: num("horizonDays"),
            paths: num("paths"),
            historicalDays: num("historicalDays"),
          });
          break;
        }

        case "get_equity_curves": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getEquityCurves({ symbol: sym, windowDays: num("windowDays") });
          break;
        }

        case "get_pretrade_risk_scan": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getPretradeRiskScan({
            symbol: sym,
            entryPrice: num("entryPrice"),
            riskRupees: num("riskRupees"),
            stopMultiple: num("stopMultiple"),
          });
          break;
        }

        case "generate_stock_images": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await generateStockImages({ symbol: sym, bars: num("bars") });
          break;
        }

        case "generate_stock_research_report": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await generateStockResearchReport({ symbol: sym });
          break;
        }

        case "get_analyze_stock": {
          const sym = str("symbol");
          if (!sym) throw new Error("symbol is required");
          result = await getAnalyzeStock({ symbol: sym });
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
