# NSE MCP

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes live Indian stock market data from the **National Stock Exchange (NSE)** to LLM clients like Claude Desktop, Cursor, VS Code, and any other MCP-compatible host.

Modelled after [OpenInsider-MCP](https://github.com/btopn/OpenInsider-MCP) but built entirely around NSE India's public data APIs.

---

## What it provides

17 tools across five categories:

| Category | Tools |
|---|---|
| Bulk / Block / Insider deals | `get_bulk_deals`, `get_block_deals`, `get_insider_trading`, `get_latest_bulk_deals`, `get_top_bulk_buys`, `get_top_bulk_sells`, `search_by_symbol` |
| Institutional flows | `get_fii_dii_activity` |
| Market data | `get_quote`, `get_market_status`, `get_nifty_indices`, `get_top_gainers`, `get_top_losers`, `get_most_active` |
| Corporate events | `get_nse_announcements`, `get_corporate_actions` |
| Short data | `get_short_selling` |

All tools return typed JSON. No scoring, no recommendations — pure data layer.

---

## Requirements

| Requirement | Version |
|---|---|
| Node.js | **≥ 20** |
| npm | ≥ 8 (bundled with Node 20) |
| Git | Any recent version |

> **Why Node 20?** The server uses the native `fetch` API and `AbortSignal.timeout()`, both of which require Node 18+. Node 20 is the active LTS and is recommended.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/manitgupta/nse-mcp.git
cd nse-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

This compiles the TypeScript source in `src/` to `dist/`. The entry point is `dist/index.js`.

### 4. Verify it starts

```bash
node dist/index.js
```

The server communicates over **stdio** (standard input/output) — it will appear to hang because it is waiting for MCP messages. That is correct. Press `Ctrl+C` to exit.

---

## Configuration

The server works out of the box with no required configuration. One optional environment variable is available:

| Variable | Default | Description |
|---|---|---|
| `NSE_MCP_UA` | Chrome 120 UA string | Override the User-Agent sent to NSE and Yahoo Finance. Useful if NSE starts blocking the default UA. |

### Setting the environment variable

**macOS / Linux**
```bash
export NSE_MCP_UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36"
```

**Windows (PowerShell)**
```powershell
$env:NSE_MCP_UA = "Mozilla/5.0 ..."
```

You can also set it inline in your MCP client config (see below).

### How NSE session auth works

NSE India's API requires browser-like cookies. On the first request the server automatically:
1. Fetches `https://www.nseindia.com` to obtain initial cookies.
2. Fetches the live-equity-market page with those cookies to complete the session.
3. Caches the session for ~7 minutes, then refreshes transparently.

No manual login or API key is needed.

---

## Adding to an MCP client

In all configs below, replace `/absolute/path/to/nse-mcp` with the actual path where you cloned the repo.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "nse-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/nse-mcp/dist/index.js"]
    }
  }
}
```

With an env override:

```json
{
  "mcpServers": {
    "nse-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/nse-mcp/dist/index.js"],
      "env": {
        "NSE_MCP_UA": "Mozilla/5.0 ..."
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### VS Code (GitHub Copilot / Continue)

Add to `.vscode/mcp.json` in your workspace, or to your user settings:

```json
{
  "servers": {
    "nse-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/nse-mcp/dist/index.js"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "nse-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/nse-mcp/dist/index.js"]
    }
  }
}
```

### Any stdio-based MCP host

```
command: node
args:    ["/absolute/path/to/nse-mcp/dist/index.js"]
```

---

## Tool reference

### `get_bulk_deals`
Today's NSE bulk deals — single-client trades of ≥ 0.5% of a company's listed shares in one session.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol (e.g. `RELIANCE`). Omit for all. |
| `dealType` | `BUY` \| `SELL` \| `ALL` | Direction filter. Default: `ALL`. |

---

### `get_block_deals`
Today's NSE block deals — negotiated trades of minimum ₹10 crore executed in the Block Deal Window.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol. Omit for all. |
| `dealType` | `BUY` \| `SELL` \| `ALL` | Direction filter. Default: `ALL`. |

---

### `get_insider_trading`
SEBI PIT (Prohibition of Insider Trading) disclosures — promoter and insider buy/sell transactions.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol. Omit for all companies. |
| `fromDate` | string | `YYYY-MM-DD`. Default: 30 days ago. |
| `toDate` | string | `YYYY-MM-DD`. Default: today. |

---

### `get_latest_bulk_deals`
Today's bulk deals sorted by trade value.

| Parameter | Type | Description |
|---|---|---|
| `dealType` | `BUY` \| `SELL` \| `ALL` | Direction filter. Default: `ALL`. |

---

### `get_top_bulk_buys`
Largest bulk-deal purchases today, ranked by total value (quantity × price).

| Parameter | Type | Description |
|---|---|---|
| `limit` | number | Results to return. Default: `10`. |
| `symbol` | string | Restrict to one symbol. |

---

### `get_top_bulk_sells`
Largest bulk-deal sales today, ranked by total value.

| Parameter | Type | Description |
|---|---|---|
| `limit` | number | Results to return. Default: `10`. |
| `symbol` | string | Restrict to one symbol. |

---

### `get_fii_dii_activity`
Daily FII and DII net buy/sell figures in the Indian cash market.

| Parameter | Type | Description |
|---|---|---|
| `limit` | number | Number of recent trading days. Default: `10`. |

---

### `get_nse_announcements`
Corporate announcements filed with NSE — board meetings, results, mergers, regulatory updates, etc. (equivalent to SEC 8-K filings).

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol. Omit for all. |
| `daysBack` | number | Announcements from the last N days. Omit for no date filter. |
| `limit` | number | Maximum results. Default: `20`. |

---

### `get_market_status`
Current open/closed status of NSE segments (Capital Market, F&O, Currency Derivatives, Commodity) plus live index levels.

No parameters.

---

### `get_nifty_indices`
Live data for all NSE indices — price, change, 52-week range, advances/declines count.

| Parameter | Type | Description |
|---|---|---|
| `name` | string | Partial, case-insensitive filter. E.g. `"BANK"` returns all bank-related indices. |

---

### `get_top_gainers`
Top gaining stocks by % change in the current session.

| Parameter | Type | Description |
|---|---|---|
| `index` | string | NSE index to scan. Default: `NIFTY 500`. |
| `limit` | number | Results to return. Default: `10`. |

---

### `get_top_losers`
Top losing stocks by % change in the current session.

| Parameter | Type | Description |
|---|---|---|
| `index` | string | NSE index to scan. Default: `NIFTY 500`. |
| `limit` | number | Results to return. Default: `10`. |

---

### `get_most_active`
Most actively traded stocks by total traded value (₹) in the current session.

| Parameter | Type | Description |
|---|---|---|
| `index` | string | NSE index to scan. Default: `NIFTY 500`. |
| `limit` | number | Results to return. Default: `10`. |

---

### `search_by_symbol`
Aggregated view for one stock — returns today's bulk deals, block deals, recent insider trades, and recent announcements in a single call.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol. **Required.** |
| `daysBack` | number | Look-back window for insider trades and announcements. Default: `30`. |

---

### `get_quote`
Live stock quote via Yahoo Finance. Returns price, 52-week range, volume, market cap, P/E ratios, dividend yield, and next earnings date. Prices are in INR.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol (e.g. `RELIANCE`, `TCS`). `.NS` exchange suffix is appended automatically. Pass `SYMBOL.BO` to query BSE instead. **Required.** |

---

### `get_short_selling`
Short-selling data as reported by brokers to NSE under SEBI's short-selling framework.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol. Omit for all. |
| `limit` | number | Return top N stocks by short-sold quantity. |

---

### `get_corporate_actions`
Upcoming and recent corporate actions — dividends, stock splits, bonus issues, rights issues, buy-backs.

| Parameter | Type | Description |
|---|---|---|
| `symbol` | string | NSE symbol. Omit for all companies. |
| `fromDate` | string | `YYYY-MM-DD`. Default: 3 months ago. |
| `toDate` | string | `YYYY-MM-DD`. Default: today. |

---

## Example prompts

Once configured, you can ask your LLM client things like:

- *"What are today's biggest bulk deals on NSE?"*
- *"Show me insider trades for RELIANCE in the last 30 days."*
- *"What is the live quote for TCS?"*
- *"Which Nifty 50 stocks are up more than 2% today?"*
- *"What's the FII/DII flow for the last 5 trading days?"*
- *"Give me all corporate actions for INFY this quarter."*
- *"Show everything you know about HDFC — deals, announcements, insider activity."*

---

## Development

```bash
# Watch mode — recompiles on every save
npm run dev

# One-shot build
npm run build

# Start the compiled server
npm start
```

### Project structure

```
src/
├── index.ts          # MCP server entry point — tool list + dispatch
├── types.ts          # Shared TypeScript interfaces
├── cache.ts          # In-memory TTL cache
├── http.ts           # Rate-paced HTTP fetcher with retry
├── nse/
│   ├── session.ts    # NSE cookie session management
│   └── fetch.ts      # NSE API client (wraps http.ts + session)
├── yahoo/
│   ├── fetch.ts      # Yahoo Finance HTTP config
│   ├── parseQuote.ts # Quote JSON parser
│   └── quoteSummary.ts
└── tools/            # One file per tool
    ├── bulkDeals.ts
    ├── blockDeals.ts
    ├── insiderTrading.ts
    ├── latestBulkDeals.ts
    ├── topBulkBuys.ts
    ├── topBulkSells.ts
    ├── fiiDiiActivity.ts
    ├── announcements.ts
    ├── marketStatus.ts
    ├── indices.ts
    ├── topGainers.ts
    ├── topLosers.ts
    ├── mostActive.ts
    ├── searchBySymbol.ts
    ├── quote.ts
    ├── shortSelling.ts
    └── corporateActions.ts
```

---

## Data sources

| Data | Source |
|---|---|
| Bulk deals, block deals, insider trading, FII/DII, indices, market status, announcements, corporate actions, short selling | NSE India public API (`nseindia.com`) |
| Live stock quotes | Yahoo Finance (`.NS` suffix for NSE, `.BO` for BSE) |

All data is fetched in real time. NSE endpoints are cached for 5 minutes; live quotes and market status for 60 seconds.

---

## License

MIT
