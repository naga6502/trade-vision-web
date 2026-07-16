import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";
import type { DealType } from "@/lib/mcp";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim() || undefined;
  const dealTypeParam = (req.nextUrl.searchParams.get("dealType") || "ALL").toUpperCase();
  const dealType: DealType = dealTypeParam === "BUY" || dealTypeParam === "SELL" ? dealTypeParam : "ALL";

  const res = await mcp.bulkDeals(symbol, dealType);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
