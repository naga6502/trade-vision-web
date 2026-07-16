import { NextRequest, NextResponse } from "next/server";
import { marketData as mcp } from "@/lib/marketData";
import type { NseStock, Quote } from "@/lib/mcp";
import type { ScreenerOutput, ScreenerScreen, FundamentalRow } from "@/lib/marketData";

export const dynamic = "force-dynamic";

// Two consumers hit this route:
//  - MarketScanners (dashboard live widget) expects the lightweight mover /
//    imbalance scan fields (onlyBuyers / onlySellers / 52W high+low).
//  - The Screeners tab expects the technical `screens` engine output.
// We compute both from one universe and return them together.

// Short in-memory cache so the 60s auto-refresh on the UI is
// cheap: the first call pays for the Yahoo fetches, repeats
// within the window return instantly instead of re-hitting the
// rate-limited upstream on every tick.
let screenerCache: { at: number; data: unknown } | null = null;
const SCREENER_TTL = 30_000;

export async function GET(_req: NextRequest) {
  if (screenerCache && Date.now() - screenerCache.at < SCREENER_TTL) {
    return NextResponse.json(screenerCache.data);
  }

  const [g, l, f] = await Promise.all([
    mcp.topGainers(30),
    mcp.topLosers(30),
    // Best-effort fundamental value screen (remote screen_stocks). Returns []
    // when the remote is unavailable/rate-limited, so it never blocks the rest.
    mcp.fundamentalScreener({ pe_max: 25, limit: 12 }),
  ]);

  if (g.error || l.error) {
    return NextResponse.json({ error: g.error || l.error }, { status: 502 });
  }

  // ---- Dashboard scanner fields (MarketScanners) -------------------------
  const stockMap = new Map<string, NseStock>();
  for (const s of [...(g.data ?? []), ...(l.data ?? [])]) stockMap.set(s.symbol, s);
  const syms = Array.from(stockMap.keys()).slice(0, 60);

  const quotes = await Promise.allSettled(syms.map((s) => mcp.quote(s)));
  const qmap = new Map<string, Quote>();
  for (let i = 0; i < syms.length; i++) {
    const res = quotes[i];
    if (res.status === "fulfilled" && res.value.data) qmap.set(syms[i], res.value.data);
  }

  const gainers = (g.data ?? []).slice(0, 10).map((s) => ({
    ...s,
    name: qmap.get(s.symbol)?.name ?? null,
  }));
  const losers = (l.data ?? []).slice(0, 10).map((s) => ({
    ...s,
    name: qmap.get(s.symbol)?.name ?? null,
  }));

  interface ScanRow {
    symbol: string;
    name: string | null;
    lastPrice: number;
    pChange: number;
    volume: number | null;
    avgVolume: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    yearHigh: number;
    yearLow: number;
    totalTradedValue: number | null;
    previousClose: number;
  }

  const rows: ScanRow[] = syms.map((sym) => {
    const st = stockMap.get(sym);
    const q = qmap.get(sym);
    const lastPrice = q?.price ?? st?.lastPrice ?? 0;
    const prev = st?.previousClose ?? q?.previousClose ?? 0;
    const pChange = st?.pChange ?? (prev ? ((lastPrice - prev) / prev) * 100 : 0);
    return {
      symbol: sym,
      name: q?.name ?? null,
      lastPrice,
      pChange,
      volume: q?.volume ?? null,
      avgVolume: q?.averageVolume ?? null,
      dayHigh: st?.dayHigh ?? null,
      dayLow: st?.dayLow ?? null,
      yearHigh: q?.fiftyTwoWeekHigh ?? 0,
      yearLow: q?.fiftyTwoWeekLow ?? 0,
      totalTradedValue: st?.totalTradedValue ?? null,
      previousClose: prev,
    };
  });

  const onlyBuyers = rows
    .filter(
      (r) =>
        r.pChange >= 5 && r.dayHigh != null && r.lastPrice > 0 && r.lastPrice >= r.dayHigh * 0.999,
    )
    .sort((a, b) => b.pChange - a.pChange)
    .slice(0, 10);

  const onlySellers = rows
    .filter(
      (r) =>
        r.pChange <= -5 && r.dayLow != null && r.lastPrice > 0 && r.lastPrice <= r.dayLow * 1.001,
    )
    .sort((a, b) => a.pChange - b.pChange)
    .slice(0, 10);

  const withQuotes = rows.filter((r) => r.yearHigh > 0 && r.lastPrice > 0);

  const fiftyTwoWeekHighs = withQuotes
    .map((r) => ({
      symbol: r.symbol,
      name: r.name,
      lastPrice: r.lastPrice,
      pChange: r.pChange,
      yearHigh: r.yearHigh,
      pctFromHigh: (r.lastPrice / r.yearHigh - 1) * 100,
    }))
    .sort((a, b) => b.lastPrice / b.yearHigh - a.lastPrice / a.yearHigh)
    .slice(0, 8);

  const fiftyTwoWeekLows = withQuotes
    .map((r) => ({
      symbol: r.symbol,
      name: r.name,
      lastPrice: r.lastPrice,
      pChange: r.pChange,
      yearLow: r.yearLow,
      pctFromLow: (r.lastPrice / r.yearLow - 1) * 100,
    }))
    .sort((a, b) => b.lastPrice / b.yearLow - a.lastPrice / a.yearLow)
    .slice(0, 8);

  // ---- Technical screener engine (Screeners tab) -------------------------
  const universe = syms.slice(0, 30);
  const screenRes = await mcp.screener({
    symbols: universe,
    screenType: "all",
    limit: 100,
    minVolume: 0,
  });

  const output: ScreenerOutput | null = screenRes.data ?? null;
  const rawScreens: ScreenerScreen[] = output?.screens ?? [];

  // Live company names come from the quotes we already fetched for the
  // universe (qmap). The engine only knows tickers, so we enrich each result
  // here — no names are hardcoded anywhere.
  const nameOf = (sym: string): string | undefined =>
    qmap.get(sym.replace(/\.(NS|BO)$/, ""))?.name ?? undefined;

  const screens: ScreenerScreen[] = rawScreens.map((s) => ({
    ...s,
    results: s.results.map((r) => ({ ...r, name: nameOf(r.symbol) })),
  }));

  // --- Model portfolio: a diversified starter book blending the screens ---
  const fundamentallyStrong: FundamentalRow[] = f;
  const picks: { symbol: string; name: string | null; tag: string; note: string }[] = [];
  const seen = new Set<string>();
  const tagFor: Record<string, string> = {
    momentum: "Momentum",
    breakout: "Breakout",
    swing: "Swing",
    intraday: "Intraday",
    "mean-reversion": "Reversal",
    volatility: "Volatility",
    "sector-rotation": "Leadership",
    accumulation: "Accumulation",
  };
  for (const s of screens) {
    const top = s.results[0];
    if (!top) continue;
    const sym = top.symbol.replace(/\.(NS|BO)$/, "");
    if (seen.has(sym)) continue;
    seen.add(sym);
    picks.push({
      symbol: sym,
      name: top.name ?? null,
      tag: tagFor[s.name] ?? s.name,
      note: `${top.reason} (score ${top.score})`,
    });
    if (picks.length >= 8) break;
  }
  const portfolio = {
    picks: picks.slice(0, 8),
    disclaimer:
      "Model portfolio for research only — not investment advice. Diversify, size positions to your risk, and verify with your own analysis.",
  };

  const body = {
    // dashboard scanner fields
    gainers,
    losers,
    onlyBuyers,
    onlySellers,
    fiftyTwoWeekHighs,
    fiftyTwoWeekLows,
    // technical screener
    screens,
    fundamentallyStrong,
    portfolio,
    generatedAt: output?.generatedAt ?? new Date().toISOString(),
    universeSize: output?.universeSize ?? universe.length,
  };

  screenerCache = { at: Date.now(), data: body };
  return NextResponse.json(body);
}
