import { NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";

// Always fetch fresh — never cache market status at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const res = await mcp.marketStatus();
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
