import { NextRequest, NextResponse } from "next/server";
import { getStockDecision } from "@/lib/tradingview";

export const dynamic = "force-dynamic";

async function handle(symbol: string) {
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  try {
    const r = await getStockDecision(symbol);
    return NextResponse.json(r);
  } catch (e) {
    // Return 200 with isError so the client can fall back to Yahoo consensus.
    return NextResponse.json({
      display: "",
      isError: true,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim() ?? "";
  return handle(symbol);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return handle((body.symbol ?? "").toString().trim());
}
