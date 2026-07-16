// Pre-computes current BUY/SELL technical verdicts for the curated stock list
// and writes web/public/signals.json. Runs at build time so the Signal Scanner
// can read signals from a static file (no runtime API call — works even when
// Vercel Authentication / Deployment Protection is enabled on the project).
//
// Imports the compiled server tool and the web's STOCKS list directly.

import { writeFileSync } from "node:fs";
import { getTechnicalAnalysis } from "../server/dist/tools/technical.js";
import { STOCKS } from "../lib/stocks";

const limit = Number(process.env.SIGNAL_LIMIT ?? 120);
const concurrency = Number(process.env.SIGNAL_CONCURRENCY ?? 6);

interface Scanned {
  symbol: string;
  name: string;
  label: string;
}

async function worker(queue: typeof STOCKS, cursor: { i: number }, out: Scanned[]) {
  while (cursor.i < queue.length) {
    const stock = queue[cursor.i++];
    try {
      const res = await getTechnicalAnalysis({ symbol: stock.symbol });
      const label = (res as any)?.summary?.label as string | undefined;
      if (label) out.push({ symbol: stock.symbol, name: stock.name, label });
    } catch {
      /* skip on failure */
    }
  }
}

async function main() {
  const queue = STOCKS.slice(0, limit);
  const out: Scanned[] = [];
  const cursor = { i: 0 };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () =>
      worker(queue, cursor, out),
    ),
  );

  const groups = { BUY: [] as Scanned[], SELL: [] as Scanned[], NEUTRAL: [] as Scanned[] };
  for (const s of out) {
    if (s.label === "STRONG BUY" || s.label === "BUY") groups.BUY.push(s);
    else if (s.label === "SELL" || s.label === "STRONG SELL") groups.SELL.push(s);
    else groups.NEUTRAL.push(s);
  }

  const payload = { generatedAt: new Date().toISOString(), scanned: out.length, groups };
  writeFileSync("public/signals.json", JSON.stringify(payload, null, 2));
  console.log(
    `signals.json written: scanned ${out.length}, BUY ${groups.BUY.length}, SELL ${groups.SELL.length}, NEUTRAL ${groups.NEUTRAL.length}`,
  );
}

main().catch((e) => {
  console.error("build-signals failed:", e);
  process.exit(1);
});
