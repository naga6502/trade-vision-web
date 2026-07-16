import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";
import { STOCKS } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Verdict = "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";

interface Scanned {
  symbol: string;
  name: string;
  label: Verdict;
}

// Scan the curated stock list for current technical verdicts so the UI can
// offer "stocks with a BUY/SELL signal" as quick-picks for the analyzer. We
// cap the scan and run with bounded concurrency to stay inside the serverless
// function timeout; symbols that error or time out are skipped.
async function scan(limit: number, concurrency: number): Promise<Scanned[]> {
  const queue = STOCKS.slice(0, limit);
  const out: Scanned[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const stock = queue[cursor++];
      const res = await mcp.technical(stock.symbol).catch(() => ({ error: "fail" }));
      if ("error" in res) continue;
      const label = (res.data as any)?.summary?.label as Verdict | undefined;
      if (label) out.push({ symbol: stock.symbol, name: stock.name, label });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 80) || 80,
    120,
  );
  const concurrency = Number(req.nextUrl.searchParams.get("concurrency") ?? 6) || 6;

  let scanned: Scanned[] = [];
  try {
    scanned = await scan(limit, concurrency);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const groups: Record<string, Scanned[]> = {
    BUY: [],
    SELL: [],
    NEUTRAL: [],
  };
  for (const s of scanned) {
    if (s.label === "STRONG BUY" || s.label === "BUY") groups.BUY.push(s);
    else if (s.label === "SELL" || s.label === "STRONG SELL") groups.SELL.push(s);
    else groups.NEUTRAL.push(s);
  }

  return NextResponse.json({
    scanned: scanned.length,
    groups,
  });
}
