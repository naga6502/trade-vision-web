import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";
import { getRemoteIpoBySymbol } from "@/lib/remoteIpo";

export const dynamic = "force-dynamic";

// IPO details for a single stock, used by the Analytics page. Returns
// `{ ipo: null }` (never an error) when there's no matching active IPO, so a
// missing IPO never blocks the rest of the analytics load. Tries the remote
// Tapetide feed first, then the local calendar.
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim() || undefined;
  const companyName =
    req.nextUrl.searchParams.get("companyName")?.trim() || undefined;

  if (!symbol && !companyName) {
    return NextResponse.json({ ipo: null });
  }

  if (symbol) {
    const remote = await getRemoteIpoBySymbol(symbol);
    if (remote) return NextResponse.json({ ipo: remote });
  }

  const res = await mcp.ipoDetails(symbol, companyName);
  if (res.error) {
    return NextResponse.json({ ipo: null });
  }
  return NextResponse.json({ ipo: res.data ?? null });
}
