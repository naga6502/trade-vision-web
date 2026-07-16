import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol query parameter is required" }, { status: 400 });
  }
  const res = await mcp.fundamentals(symbol);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
