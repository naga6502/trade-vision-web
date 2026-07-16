import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

export const dynamic = "force-dynamic";

// Self-hosted OHLC history for the technical chart. Replaces the third-party
// TradingView embed so the main chart always renders from our own data.
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const range = (req.nextUrl.searchParams.get("range")?.trim() || "3M").toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "symbol query parameter is required" }, { status: 400 });
  }
  const res = await mcp.priceHistory(symbol, range);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
