import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? undefined;
  const r = await mcp.boardMeetings(symbol);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ meetings: r.data ?? [] });
}
