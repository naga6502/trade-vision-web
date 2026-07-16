import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const limitParam = sp.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const r = await mcp.pastIpos(from, to, limit);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ipos: r.data ?? [] });
}
