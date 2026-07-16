import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  const r = await mcp.ipoProspectus(symbol);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json(r.data ?? { symbol, drhpUrl: null, rhpUrl: null });
}
