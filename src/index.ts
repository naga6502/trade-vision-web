#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
import { getShortSelling } from "./tools/shortSelling.js";
import { getCorporateActions } from "./tools/corporateActions.js";

const server = new Server(
  { name: "nse-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

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
              "NSE index to scan. Default: \"NIFTY 500\". Options: \"NIFTY 50\", \"NIFTY BANK\", \"NIFTY IT\", etc.",
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
              "NSE index to scan. Default: \"NIFTY 500\". Options: \"NIFTY 50\", \"NIFTY BANK\", \"NIFTY IT\", etc.",
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
  ],
}));

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
