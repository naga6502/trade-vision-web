// Client for the self-hosted TradingView MCP server (https://mcpmarket.com/server/tradingview).
// The server is a Python MCP server (tradingview-mcp-server) exposing tools such as
// get_stock_decision / get_technical_analysis. It is reached over MCP (Streamable
// HTTP or stdio-tunneled). Credentials come from the environment (web/.env.local)
// so the token never reaches the browser.

const TV_URL = process.env.TV_MCP_URL || "";
const TOKEN = process.env.TV_MCP_TOKEN || "";

export interface ToolCallResult {
  content: { type: string; text?: string }[];
  isError?: boolean;
  structuredContent?: unknown;
}

// Parse a response body that may be plain JSON or SSE-framed (text/event-stream).
function parseBody(raw: string): any {
  const trimmed = raw.trim();
  if (trimmed.startsWith("event:") || trimmed.startsWith("data:")) {
    const data = trimmed
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("\n");
    return JSON.parse(data || trimmed);
  }
  return JSON.parse(trimmed);
}

async function rpc(method: string, params: unknown): Promise<any> {
  if (!TOKEN) {
    throw new Error(
      "TV_MCP_TOKEN is not set. Add TV_MCP_URL and TV_MCP_TOKEN to web/.env.local, " +
        "then start the tradingview-mcp-server (pip install tradingview-mcp-server)."
    );
  }
  if (!TV_URL) {
    throw new Error("TV_MCP_URL is not set. Add it to web/.env.local.");
  }
  const res = await fetch(TV_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`TradingView MCP ${method} failed (${res.status}): ${raw.slice(0, 200)}`);
  }
  const json = parseBody(raw);
  if (json.error) throw new Error(json.error.message || "TradingView MCP error");
  return json.result;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const result = await rpc("tools/call", { name, arguments: args });
  return result as ToolCallResult;
}

// Turn a tool result into a pretty string for display.
export function resultToText(result: ToolCallResult): string {
  if (result.structuredContent !== undefined) {
    return JSON.stringify(result.structuredContent, null, 2);
  }
  const first = result.content?.[0];
  if (first?.text) {
    try {
      return JSON.stringify(JSON.parse(first.text), null, 2);
    } catch {
      return first.text;
    }
  }
  return JSON.stringify(result, null, 2);
}

// Convenience: fetch the TradingView BUY/SELL/HOLD decision for a symbol.
export async function getStockDecision(symbol: string): Promise<{
  display: string;
  isError: boolean;
}> {
  const result = await callTool("get_stock_decision", { symbol });
  return { display: resultToText(result), isError: result.isError ?? false };
}
