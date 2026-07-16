import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";
import { SECTORS, scoreStock, type SectorTag } from "@/lib/sectors";

export const dynamic = "force-dynamic";

interface ScoredStock {
  symbol: string;
  price: number;
  pe: number | null;
  marketCap: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  pos52: number | null;
  dividendYield: number | null;
  strength: number;
  tag: SectorTag;
}

// Bounded-concurrency map so we don't fire ~120 quote calls at once.
async function mapLimit<T, U>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<U>,
): Promise<U[]> {
  const out = new Array<U>(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function GET(_req: NextRequest) {
  const allSyms = Array.from(new Set(SECTORS.flatMap((s) => s.symbols)));

  const quotes = await mapLimit(allSyms, 8, async (sym) => {
    const r = await mcp.quote(sym);
    return { sym, q: r.data ?? null };
  });

  // Normalize the size/quality axis across the whole scanned universe.
  const caps = quotes
    .map((x) => x.q?.marketCap)
    .filter((c): c is number => c != null && c > 0);
  const capMin = caps.length ? Math.min(...caps) : 0;
  const capMax = caps.length ? Math.max(...caps) : 0;

  const sectors = SECTORS.map((sec) => {
    const stocks: ScoredStock[] = [];
    for (const sym of sec.symbols) {
      const q = quotes.find((x) => x.sym === sym)?.q ?? null;
      if (!q || q.price == null) continue; // unresolvable ticker -> skip
      const { strength, tag } = scoreStock({ q, capMin, capMax });
      const pos52 =
        q.fiftyTwoWeekHigh && q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh > q.fiftyTwoWeekLow && q.price != null
          ? Math.round(((q.price - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100)
          : null;
      stocks.push({
        symbol: sym,
        price: q.price,
        pe: q.trailingPE ?? null,
        marketCap: q.marketCap ?? null,
        yearHigh: q.fiftyTwoWeekHigh ?? null,
        yearLow: q.fiftyTwoWeekLow ?? null,
        pos52,
        dividendYield: q.dividendYield ?? null,
        strength,
        tag,
      });
    }
    stocks.sort((a, b) => b.strength - a.strength);
    return { name: sec.name, stocks: stocks.slice(0, 5) };
  }).filter((s) => s.stocks.length > 0);

  return NextResponse.json({ sectors });
}
