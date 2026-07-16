import { NextRequest, NextResponse } from "next/server";
import { mcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const url = sp.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  const r = await mcp.downloadDocument(url);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json(r.data ?? { url, contentType: null, isText: false, snippet: null, length: null });
}
