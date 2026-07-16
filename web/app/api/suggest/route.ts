import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YAHOO = "https://query1.finance.yahoo.com/v1/finance/search";

interface Suggestion {
  symbol: string;
  name: string;
  exchDisp: string;
  typeDisp: string;
}

// Short-lived in-memory cache (per server instance) to avoid hammering Yahoo.
const cache = new Map<string, { ts: number; data: Suggestion[] }>();
const TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  const key = q.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ suggestions: cached.data });
  }

  try {
    const r = await fetch(
      `${YAHOO}?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; nse-dashboard/1.0)" },
        cache: "no-store",
      }
    );
    const j = await r.json();
    const quotes: any[] = j?.quotes || [];
    const suggestions: Suggestion[] = quotes
      .filter(
        (x) =>
          x.symbol &&
          (x.symbol.endsWith(".NS") ||
            x.exchDisp === "NSE" ||
            x.exchangeDisp === "NSE")
      )
      .map((x) => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || "",
        exchDisp: x.exchDisp || x.exchangeDisp || "",
        typeDisp: x.quoteType || "",
      }))
      .slice(0, 8);

    cache.set(key, { ts: Date.now(), data: suggestions });
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json(
      { suggestions: [], error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
