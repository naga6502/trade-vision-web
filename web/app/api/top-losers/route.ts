import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

export async function GET(req: NextRequest) {
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || "10");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;

  const res = await mcp.topLosers(limit);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
