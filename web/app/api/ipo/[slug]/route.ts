import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";
import { getRemoteIpoBySymbol } from "@/lib/remoteIpo";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.trim();
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim() || undefined;

  // The calendar links by company name (always present); symbols are optional
  // for pre-listing IPOs, so default the slug to a company-name lookup.
  const companyName = symbol ? undefined : slug;

  // Remote Tapetide feed is the live source; fall back to the local calendar.
  const remote = await getRemoteIpoBySymbol(symbol ?? slug ?? "");
  if (remote) return NextResponse.json(remote);

  const res = await mcp.ipoDetails(symbol, companyName);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  if (!res.data) {
    return NextResponse.json({ error: "IPO not found" }, { status: 404 });
  }
  return NextResponse.json(res.data);
}
