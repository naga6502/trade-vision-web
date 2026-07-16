import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

// type: quote | gainers | losers | breadth | results
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "gainers";
  const scrip = sp.get("scrip") ?? undefined;

  let r:
    | { error?: string; data?: unknown }
    | null = null;

  switch (type) {
    case "quote":
      if (!scrip) return NextResponse.json({ error: "scrip is required" }, { status: 400 });
      r = await mcp.bseQuote(scrip);
      break;
    case "gainers":
      r = await mcp.bseGainers();
      break;
    case "losers":
      r = await mcp.bseLosers();
      break;
    case "breadth":
      r = await mcp.bseBreadth();
      break;
    case "results":
      r = await mcp.bseResultCalendar();
      break;
    default:
      return NextResponse.json({ error: `unknown type: ${type}` }, { status: 400 });
  }

  if (r?.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ data: r?.data ?? null });
}
