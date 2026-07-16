import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const yearParam = sp.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  const r = await mcp.marketHolidays(year);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ holidays: r.data ?? [] });
}
