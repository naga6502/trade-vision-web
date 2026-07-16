import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const symbol = p.get("symbol")?.trim() || undefined;
  const category = p.get("category")?.trim() || "stocks";
  const limitRaw = p.get("limit")?.trim();
  const limit = limitRaw ? Number(limitRaw) : 20;

  try {
    const r = await mcp.news({ symbol, category, limit });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({
      items: [],
      count: 0,
      provider: "rss",
      symbol: symbol ?? null,
      category,
      isError: true,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
