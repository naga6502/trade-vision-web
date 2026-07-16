import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp";
import { createMcpServer } from "trade-vision/server";

// Run on the Node.js runtime (the MCP tool fns use node:fetch, AbortSignal.timeout,
// and pull in yahoo-finance2). Never on edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stateless Streamable HTTP: one fresh Server per request. The NSE session +
// data caches in src/nse/session.ts and src/cache.ts are module-level, so they
// stay shared across requests within this Next.js process.
async function handle(req: Request): Promise<Response> {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true, // plain JSON body (matches web/lib/mcpClient.parseBody)
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
