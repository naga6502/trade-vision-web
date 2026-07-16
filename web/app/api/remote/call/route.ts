import { NextRequest, NextResponse } from "next/server";
import { callTool, resultToText } from "@/lib/mcpClient";

export const dynamic = "force-dynamic";

async function handle(name: string, args: Record<string, unknown>, baseUrl: string) {
  if (!name) {
    return NextResponse.json({ error: "tool name is required" }, { status: 400 });
  }
  try {
    const result = await callTool(name, args ?? {}, baseUrl);
    return NextResponse.json({
      isError: result.isError ?? false,
      display: resultToText(result),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return handle(body.name, body.args ?? {}, `${req.nextUrl.origin}/api/mcp`);
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const argsRaw = req.nextUrl.searchParams.get("args");
  let args: Record<string, unknown> = {};
  if (argsRaw) {
    try {
      args = JSON.parse(argsRaw);
    } catch {
      return NextResponse.json({ error: "args must be JSON" }, { status: 400 });
    }
  }
  return handle(name, args, `${req.nextUrl.origin}/api/mcp`);
}
