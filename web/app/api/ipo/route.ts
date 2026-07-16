import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";
import { getRemoteIpos } from "@/lib/remoteIpo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? undefined;
  const exchange = sp.get("exchange") ?? undefined;
  const limitParam = sp.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // Remote Tapetide feed is the live source (local NSE scraper 404s); fall
  // back to the local calendar only if the remote returns nothing.
  let ipos = await getRemoteIpos(status);
  if (ipos.length === 0) {
    const res = await mcp.ipoCalendar(status, exchange, limit);
    ipos = res.data ?? [];
  }

  if (exchange) {
    const ex = exchange.toUpperCase();
    ipos = ipos.filter((i) => i.exchange.toUpperCase().includes(ex));
  }
  if (limit && limit > 0) ipos = ipos.slice(0, limit);
  return NextResponse.json({ ipos });
}
