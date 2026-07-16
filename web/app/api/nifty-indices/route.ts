import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim() || undefined;

  const res = await mcp.niftyIndices(name);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
