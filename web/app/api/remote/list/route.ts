import { NextRequest, NextResponse } from "next/server";
import { listTools } from "@/lib/mcpClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const baseUrl = `${req.nextUrl.origin}/api/mcp`;
    const tools = await listTools(baseUrl);
    return NextResponse.json({ tools });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
