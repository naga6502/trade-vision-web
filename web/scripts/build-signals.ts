// Pre-computes current BUY/SELL technical verdicts for the curated stock list
// and writes web/public/signals.json. Runs at build time so the Signal Scanner
// can read signals from a static file (no runtime API call — works even when
// Vercel Authentication / Deployment Protection is enabled on the project).
//
// Imports the compiled server tool and the web's STOCKS list directly.

import { writeFileSync } from "node:fs";
import { getTechnicalAnalysis } from "../server/dist/tools/technical.js";
import { STOCKS } from "../lib/stocks";

const concurrency = Number(process.env.SIGNAL_CONCURRENCY ?? 4);
const RETRIES = Number(process.env.SIGNAL_RETRIES ?? 5);

interface Scanned {
  symbol: string;
  name: string;
  label: string;
  price: number;
  triggerPrice: number;
  triggerDate?: string;
  plan?: {
    buyZone?: { low: number; high: number; strength: number };
    sellZone?: { low: number; high: number; strength: number };
    longStop?: number;
    longTarget?: number;
    shortStop?: number;
    shortTarget?: number;
  };
}

function compactPlan(res: any): Scanned["plan"] {
  const c = res?.confluence;
  if (!c) return undefined;
  const z = (z: any) =>
    z ? { low: z.low, high: z.high, strength: z.strength } : undefined;
  return {
    buyZone: z(c.buyZone),
    sellZone: z(c.sellZone),
    longStop: c.longStop ?? undefined,
    longTarget: c.longTarget ?? undefined,
    shortStop: c.shortStop ?? undefined,
    shortTarget: c.shortTarget ?? undefined,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Yahoo finance is flaky under load and rate-limits bursts; retry with
// exponential backoff + jitter so a transient throttle doesn't silently drop
// a symbol from the scan.
async function analyzeWithRetry(symbol: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await getTechnicalAnalysis({ symbol });
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) {
        const base = Math.min(8000, 500 * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * 300);
        await sleep(base + jitter);
      }
    }
  }
  throw lastErr;
}

async function worker(
  queue: typeof STOCKS,
  cursor: { i: number },
  out: Scanned[],
  failed: { symbol: string; error: string }[],
) {
  while (cursor.i < queue.length) {
    const stock = queue[cursor.i++];
    try {
      const res = await analyzeWithRetry(stock.symbol);
      const label = (res as any)?.summary?.label as string | undefined;
      const price = (res as any)?.price as number | undefined;
      const triggerPrice = (res as any)?.triggerPrice as number | undefined;
      const triggerDate = (res as any)?.triggerDate as string | undefined;
      if (label)
        out.push({
          symbol: stock.symbol,
          name: stock.name,
          label,
          price: price ?? NaN,
          triggerPrice: triggerPrice ?? NaN,
          triggerDate,
          plan: compactPlan(res),
        });
    } catch (e) {
      failed.push({
        symbol: stock.symbol,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function main() {
  // Scan the entire curated list — no hard cap on how many symbols we cover.
  const queue = STOCKS;
  const out: Scanned[] = [];
  const failed: { symbol: string; error: string }[] = [];
  const cursor = { i: 0 };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () =>
      worker(queue, cursor, out, failed),
    ),
  );

  const groups = { BUY: [] as Scanned[], SELL: [] as Scanned[], NEUTRAL: [] as Scanned[] };
  for (const s of out) {
    if (s.label === "STRONG BUY" || s.label === "BUY") groups.BUY.push(s);
    else if (s.label === "SELL" || s.label === "STRONG SELL") groups.SELL.push(s);
    else groups.NEUTRAL.push(s);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    scanned: out.length,
    total: queue.length,
    failed: failed.map((f) => f.symbol),
    groups,
  };
  writeFileSync("public/signals.json", JSON.stringify(payload, null, 2));
  console.log(
    `signals.json written: scanned ${out.length}/${queue.length}, failed ${failed.length}, BUY ${groups.BUY.length}, SELL ${groups.SELL.length}, NEUTRAL ${groups.NEUTRAL.length}`,
  );
  if (failed.length) {
    console.warn("failed symbols:", failed.map((f) => f.symbol).join(", "));
  }
}

main().catch((e) => {
  console.error("build-signals failed:", e);
  process.exit(1);
});
