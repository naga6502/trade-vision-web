// Client for a Streamable HTTP MCP server (stateless). Defaults to the
// self-hosted endpoint served by this app at /api/mcp, but can be pointed at
// any external MCP server via MCP_HTTP_URL. The Bearer token is optional and
// read from the environment so it never reaches the browser.

const MCP_URL = process.env.MCP_HTTP_URL || "/api/mcp";
const TOKEN = process.env.MCP_HTTP_TOKEN;

export interface RemoteTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, ToolProperty>;
    required?: string[];
  };
}

export interface ToolProperty {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolCallResult {
  content: { type: string; text?: string }[];
  isError?: boolean;
  structuredContent?: unknown;
}

// Resolve a base URL that may be relative ("/api/mcp") against an origin when
// one is supplied, or already absolute.
function resolveUrl(baseUrl: string): string {
  if (/^https?:\/\//.test(baseUrl)) return baseUrl;
  const origin = process.env.MCP_HTTP_ORIGIN || "";
  return origin + baseUrl;
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

async function rpc(method: string, params: unknown, baseUrl: string = MCP_URL): Promise<any> {
  const res = await fetch(resolveUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`MCP ${method} failed (${res.status}): ${raw.slice(0, 200)}`);
  }
  const json = parseBody(raw);
  if (json.error) throw new Error(json.error.message || "MCP error");
  return json.result;
}

export async function listTools(baseUrl?: string): Promise<RemoteTool[]> {
  const result = await rpc("tools/list", {}, baseUrl);
  return (result?.tools ?? []) as RemoteTool[];
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  baseUrl?: string,
): Promise<ToolCallResult> {
  const result = await rpc("tools/call", { name, arguments: args }, baseUrl);
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
