import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol)
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  const res = await mcp.analyzeStock(symbol);
  if (res.error)
    return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json(res.data);
}
