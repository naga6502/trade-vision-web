import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol")?.trim();
  if (!symbol)
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  const num = (k: string): number | undefined => {
    const v = sp.get(k);
    if (v == null) return undefined;
    const x = Number(v);
    return Number.isFinite(x) ? x : undefined;
  };

  const res = await mcp.equityCurves(symbol, num("windowDays"));
  if (res.error)
    return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json(res.data);
}
