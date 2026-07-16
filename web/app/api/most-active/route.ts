import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || "10");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;
  // NIFTY 50 is the most reliable index for this endpoint; allow override.
  const index = req.nextUrl.searchParams.get("index")?.trim() || "NIFTY 50";

  const res = await mcp.mostActive(limit, index);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
