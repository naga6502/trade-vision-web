import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol");
  const expiry = sp.get("expiry") ?? undefined;
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  const [chain, expiries, lots] = await Promise.all([
    mcp.optionChain(symbol, expiry),
    mcp.optionExpiries(symbol),
    mcp.fnoLots(symbol),
  ]);

  if (chain.error) return NextResponse.json({ error: chain.error }, { status: 502 });
  return NextResponse.json({
    chain: chain.data ?? null,
    expiries: expiries.data ?? [],
    lots: lots.data ?? null,
  });
}
