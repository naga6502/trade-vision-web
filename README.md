# Trade Vision

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

The server also includes fundamentals, technical analysis, chart-pattern detection, a stock screener, IPO intelligence, option-chain analytics, BSE data, and market-holiday/VIX tools (added beyond the original 17).

### Quant & analytics (native, no external API key)

These mirror the feature set of quant-finance MCP servers but are computed locally from Yahoo Finance history + NSE data — no paid API, no widget host:

| Tool | What it returns |
|---|---|
| `get_ai_prediction` | Next-session directional bias from a transparent weighted ensemble (technical structure, momentum, patterns, FII flow, vol regime). *Heuristic, not a trained ML model.* |
| `get_iv_radar` | ATM IV, IV rank/percentile (realised-vol proxy), risk reversal, vol regime — from the live option chain. |
| `get_option_pressure` | Max pain, gamma wall (OI-weighted approximation), expected move, squeeze targets, call/put pressure zones. |
| `get_monte_carlo` | GBM Monte Carlo (10k paths / 30d): mean/median, 68% & 90% ranges, prob above spot, prob -10%, distribution. |
| `get_equity_curves` | Backtest of buy&hold, SMA 50/200, RSI mean-reversion, MACD cross — Sharpe, Sortino, max DD, win rate. |
| `get_pretrade_risk_scan` | Liquidity, ATR vol, suggested stop, position sizing, gap/earnings risk, PROCEED/REDUCE/AVOID call. |
| `generate_stock_images` | Three native SVG charts (candlestick, IV-by-strike, options-flow heatmap) written to `charts/`. |
| `generate_stock_research_report` | One markdown research note synthesising every signal source. |
| `get_analyze_stock` | Aggregate STRONG BUY → STRONG SELL verdict with confidence + bullish/bearish factors. |

All tools return typed JSON.

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
git clone https://github.com/manitgupta/trade-vision.git
cd trade-vision
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

In all configs below, replace `/absolute/path/to/trade-vision` with the actual path where you cloned the repo.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "trade-vision": {
      "command": "node",
      "args": ["/absolute/path/to/trade-vision/dist/index.js"]
    }
  }
}
```

With an env override:

```json
{
  "mcpServers": {
    "trade-vision": {
      "command": "node",
      "args": ["/absolute/path/to/trade-vision/dist/index.js"],
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
    "trade-vision": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/trade-vision/dist/index.js"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trade-vision": {
      "command": "node",
      "args": ["/absolute/path/to/trade-vision/dist/index.js"]
    }
  }
}
```

### Any stdio-based MCP host

```
command: node
args:    ["/absolute/path/to/trade-vision/dist/index.js"]
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

## Web Dashboard

A Next.js dashboard (`web/`) visualizes the same data the MCP server exposes. It
imports the compiled tool functions from `dist/` and serves them as REST
endpoints, then renders charts, tables, and cards with Bootstrap + Recharts.

### Run it

```bash
npm run web:install   # install web deps (one time)
npm run web:dev       # builds dist/ then starts Next.js on http://localhost:3000
```

Open http://localhost:3000. Use `npm run web:build` + `npm run web:start` for a
production build.

### REST endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market-status` | NSE market sessions (open/closed) |
| GET | `/api/top-gainers?limit=10` | Top gaining stocks |
| GET | `/api/top-losers?limit=10` | Top losing stocks |
| GET | `/api/fii-dii?limit=10` | FII/DII net flows (₹ Cr) |
| GET | `/api/bulk-deals?symbol=&dealType=ALL` | Today's bulk deals |
| GET | `/api/quote?symbol=RELIANCE` | Live quote for a symbol |
| GET | `/api/news?symbol=&category=stocks&limit=20` | Latest news — stock + market (TradingView MCP `financial_news`) |

The endpoints are also handy for scripting via `curl`.

### News tab

Latest news is fetched **directly** by the Next.js backend (`web/lib/news.ts` →
`/api/news`) — no external MCP server or API key required. It aggregates public
market RSS feeds (Moneycontrol, LiveMint, Economic Times, CNBC TV18) server-side
and optionally filters by symbol.

- **News** tab on a stock (`/stock/<SYMBOL>/news`) has two views:
  - **Stock News** — headlines mentioning the current symbol.
  - **Market News** — all-market headlines.
- **Market News** in the sidebar (`/news`) is the standalone, symbol-free view. It is filtered to stock / equity-market related headlines — politics, sports, entertainment and other non-market news are excluded.

Feeds are cached for 5 minutes. To add or change sources, edit `MARKET_FEEDS` in
`web/lib/news.ts`.

---

## Deployment

The web app and the MCP server can be deployed **together as a single process**.
The Next.js app serves the dashboard *and* a standards-compliant, networked MCP
endpoint at `/api/mcp` (stateless Streamable HTTP). The same 21 tools the stdio
server exposes are available over HTTP — no second process or reverse proxy.

### Prerequisites

- Node.js **≥ 20**
- The root build must run **before** the web build, because the web app imports
  the compiled tool functions from `dist/`. The `web:build` script already does
  this in the right order.

### 1. Run locally (development)

```bash
npm install            # root deps (one time)
npm run web:install    # web deps (one time)
npm run web:dev        # builds dist/ then starts Next.js on http://localhost:3000
```

Open http://localhost:3000 for the dashboard, or hit the MCP endpoint directly
(see below).

### 2. Run locally (production build)

```bash
npm run build          # tsc -> dist/
npm run web:build      # next build (needs dist/ above)
npm run web:start      # next start on http://localhost:3000 (honors $PORT)
```

### 3. The embedded MCP endpoint (`/api/mcp`)

Stateless Streamable HTTP. Test it with `curl`:

```bash
# List tools
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Call a tool
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_market_status","arguments":{}}}'
```

The dashboard's **Remote MCP** page (`/remote`) uses this same endpoint via
`web/lib/mcpClient.ts` (defaults to same-origin `/api/mcp`).

### 4. Run with Docker

A single-process image builds `dist/` then the Next.js app and runs `next start`:

```bash
docker build -t trade-vision .
docker run -p 3000:3000 trade-vision
```

Then visit http://localhost:3000 and/or call `/api/mcp` as above.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the Next.js server listens on. |
| `NSE_MCP_UA` | Chrome 120 UA | Override the User-Agent sent to NSE/Yahoo. Set if NSE throttles the server's IP. |
| `MCP_HTTP_URL` | `/api/mcp` | Point the Remote-MCP client at an external MCP server instead of the self-hosted endpoint. |
| `MCP_HTTP_TOKEN` | *(unset)* | Optional `Authorization: Bearer` token sent by the Remote-MCP client. |

> **Note on cloud hosting:** NSE India may throttle or block datacenter IPs.
> The in-memory session cache (7-min TTL) still applies per container. If you
> get blocked, set `NSE_MCP_UA` or route egress through a proxy. `/api/mcp` is
> unauthenticated by default — add a Bearer-token check in
> `web/app/api/mcp/route.ts` before exposing it publicly.

---

## License

MIT
