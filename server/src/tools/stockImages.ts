import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { validateSymbol, fetchDailyBars, round } from "../quant/util.js";
import { getOptionChain } from "../options/optionChain.js";

// Native SVG chart generator. Produces three charts for a symbol — candlestick
// price, implied-volatility-by-strike, and an options-flow (OI) heatmap — and
// writes them to a local `charts/` directory. No external image host: the SVGs
// are returned inline and saved to disk so they can be embedded in reports/UI.

export interface ChartFile {
  type: "candlestick" | "iv_surface" | "options_flow";
  title: string;
  path: string;
  svg: string;
}

export interface StockImagesResult {
  symbol: string;
  charts: ChartFile[];
  notes: string[];
  generatedAt: string;
}

export interface StockImagesArgs {
  /** NSE symbol, e.g. RELIANCE. */
  symbol: string;
  /** Number of trailing daily bars for the candlestick chart. Default: 60. */
  bars?: number;
}

const W = 820;
const H = 360;
const M = { top: 24, right: 16, bottom: 28, left: 56 };

function esc(n: number): string {
  return Number.isFinite(n) ? String(round(n, 2)) : "";
}

function candlestickSvg(bars: { date: string; open: number; high: number; low: number; close: number }[]): string {
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const lo = Math.min(...bars.map((b) => b.low));
  const hi = Math.max(...bars.map((b) => b.high));
  const range = hi - lo || 1;
  const y = (p: number) => M.top + plotH - ((p - lo) / range) * plotH;
  const step = bars.length > 1 ? plotW / (bars.length - 1) : plotW;
  const bw = Math.max(2, step * 0.6);

  let body = `<rect x="0" y="0" width="${W}" height="${H}" fill="#0b0f1a"/>`;
  // horizontal gridlines
  for (let i = 0; i <= 4; i++) {
    const gy = M.top + (plotH * i) / 4;
    const price = hi - (range * i) / 4;
    body += `<line x1="${M.left}" y1="${gy}" x2="${W - M.right}" y2="${gy}" stroke="#1c2434"/>`;
    body += `<text x="${M.left - 6}" y="${gy + 4}" fill="#7f8aa3" font-size="11" text-anchor="end">${esc(price)}</text>`;
  }
  bars.forEach((b, i) => {
    const x = M.left + i * step;
    const up = b.close >= b.open;
    const color = up ? "#16c784" : "#ea3943";
    const yOpen = y(b.open);
    const yClose = y(b.close);
    const top = Math.min(yOpen, yClose);
    const hgt = Math.max(1, Math.abs(yClose - yOpen));
    body += `<line x1="${x}" y1="${y(b.high)}" x2="${x}" y2="${y(b.low)}" stroke="${color}" stroke-width="1"/>`;
    body += `<rect x="${x - bw / 2}" y="${top}" width="${bw}" height="${hgt}" fill="${color}"/>`;
  });
  body += `<text x="${M.left}" y="16" fill="#cdd6e8" font-size="13">Candlestick · last ${bars.length} sessions</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

function ivSurfaceSvg(
  smile: { strike: number; iv: number | null }[],
  underlying: number | null,
): string {
  const pts = smile.filter((p) => p.iv != null) as { strike: number; iv: number }[];
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  if (!pts.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0b0f1a"/><text x="${M.left}" y="${H / 2}" fill="#7f8aa3">No IV data (non-F&amp;O or NSE blocked)</text></svg>`;
  }
  const ks = pts.map((p) => p.strike);
  const vs = pts.map((p) => p.iv);
  const kLo = Math.min(...ks);
  const kHi = Math.max(...ks);
  const vLo = Math.min(...vs);
  const vHi = Math.max(...vs);
  const kR = kHi - kLo || 1;
  const vR = vHi - vLo || 1;
  const x = (k: number) => M.left + ((k - kLo) / kR) * plotW;
  const y = (v: number) => M.top + plotH - ((v - vLo) / vR) * plotH;

  const poly = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.strike).toFixed(1)},${y(p.iv).toFixed(1)}`).join(" ");
  const area = `${poly} L${x(kHi).toFixed(1)},${M.top + plotH} L${x(kLo).toFixed(1)},${M.top + plotH} Z`;
  let body = `<rect width="${W}" height="${H}" fill="#0b0f1a"/>`;
  body += `<path d="${area}" fill="#13325a" opacity="0.5"/>`;
  body += `<path d="${poly}" fill="none" stroke="#4ea8ff" stroke-width="2"/>`;
  for (const p of pts) {
    body += `<circle cx="${x(p.strike).toFixed(1)}" cy="${y(p.iv).toFixed(1)}" r="2.5" fill="#9fd0ff"/>`;
  }
  if (underlying != null) {
    body += `<line x1="${x(underlying)}" y1="${M.top}" x2="${x(underlying)}" y2="${M.top + plotH}" stroke="#8a93ab" stroke-dasharray="4 3"/>`;
    body += `<text x="${x(underlying) + 4}" y="${M.top + 12}" fill="#8a93ab" font-size="10">spot</text>`;
  }
  body += `<text x="${M.left}" y="16" fill="#cdd6e8" font-size="13">Implied volatility by strike</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

function optionsFlowSvg(
  strikes: { strikePrice: number; ce: { openInterest: number } | null; pe: { openInterest: number } | null }[],
): string {
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  if (!strikes.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0b0f1a"/><text x="${M.left}" y="${H / 2}" fill="#7f8aa3">No option-chain data</text></svg>`;
  }
  const maxOi = Math.max(
    1,
    ...strikes.map((s) => Math.max(s.ce?.openInterest ?? 0, s.pe?.openInterest ?? 0)),
  );
  const kLo = strikes[0].strikePrice;
  const kHi = strikes[strikes.length - 1].strikePrice;
  const kR = kHi - kLo || 1;
  const x = (k: number) => M.left + ((k - kLo) / kR) * plotW;
  const half = plotH / 2;
  let body = `<rect width="${W}" height="${H}" fill="#0b0f1a"/>`;
  // mid line
  body += `<line x1="${M.left}" y1="${M.top + half}" x2="${W - M.right}" y2="${M.top + half}" stroke="#1c2434"/>`;
  body += `<text x="${M.left}" y="${M.top + 12}" fill="#cdd6e8" font-size="13">Options flow · OI by strike (calls up / puts down)</text>`;
  body += `<text x="${M.left}" y="${M.top + half - 4}" fill="#7f8aa3" font-size="10">CE</text>`;
  body += `<text x="${M.left}" y="${M.top + half + 14}" fill="#7f8aa3" font-size="10">PE</text>`;
  const bw = Math.max(2, plotW / strikes.length - 1);
  for (const s of strikes) {
    const cx = x(s.strikePrice);
    const ceOi = s.ce?.openInterest ?? 0;
    const peOi = s.pe?.openInterest ?? 0;
    if (ceOi > 0) {
      const h = (ceOi / maxOi) * half;
      body += `<rect x="${cx - bw / 2}" y="${M.top + half - h}" width="${bw}" height="${h}" fill="#16c784" opacity="0.85"/>`;
    }
    if (peOi > 0) {
      const h = (peOi / maxOi) * half;
      body += `<rect x="${cx - bw / 2}" y="${M.top + half}" width="${bw}" height="${h}" fill="#ea3943" opacity="0.85"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

export async function generateStockImages(args: StockImagesArgs): Promise<StockImagesResult> {
  const ticker = validateSymbol(args.symbol);
  const base = ticker.replace(/\.(NS|BO)$/, "");
  const nbars = Math.max(10, Math.min(252, args.bars ?? 60));

  const notes: string[] = [];
  const { bars } = await fetchDailyBars(ticker, nbars).catch(() => ({ ticker, bars: [] as any[] }));
  const cbars = bars.map((b) => ({ date: b.date, open: b.open, high: b.high, low: b.low, close: b.close }));

  let smile: { strike: number; iv: number | null }[] = [];
  let underlying: number | null = null;
  let chainStrikes: any[] = [];
  try {
    const chain = await getOptionChain(base).catch(() => null);
    if (chain && chain.strikes.length) {
      underlying = chain.underlying;
      smile = chain.strikes.map((s) => {
        const parts: number[] = [];
        if (s.ce && s.ce.impliedVolatility > 0) parts.push(s.ce.impliedVolatility);
        if (s.pe && s.pe.impliedVolatility > 0) parts.push(s.pe.impliedVolatility);
        return {
          strike: s.strikePrice,
          iv: parts.length ? round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100, 2) : null,
        };
      });
      chainStrikes = chain.strikes;
    } else {
      notes.push("Option chain unavailable — IV/flow charts omitted or empty.");
    }
  } catch {
    notes.push("Option chain unavailable — IV/flow charts omitted or empty.");
  }

  const outDir = join(process.cwd(), "charts");
  mkdirSync(outDir, { recursive: true });

  const charts: ChartFile[] = [];
  if (cbars.length >= 2) {
    const svg = candlestickSvg(cbars);
    const path = join(outDir, `${base}_candlestick.svg`);
    writeFileSync(path, svg, "utf8");
    charts.push({ type: "candlestick", title: "Candlestick price", path, svg });
  }
  {
    const svg = ivSurfaceSvg(smile, underlying);
    const path = join(outDir, `${base}_iv_surface.svg`);
    writeFileSync(path, svg, "utf8");
    charts.push({ type: "iv_surface", title: "Implied volatility by strike", path, svg });
  }
  {
    const svg = optionsFlowSvg(
      chainStrikes.map((s) => ({
        strikePrice: s.strikePrice,
        ce: s.ce ? { openInterest: s.ce.openInterest } : null,
        pe: s.pe ? { openInterest: s.pe.openInterest } : null,
      })),
    );
    const path = join(outDir, `${base}_options_flow.svg`);
    writeFileSync(path, svg, "utf8");
    charts.push({ type: "options_flow", title: "Options flow (OI by strike)", path, svg });
  }

  return {
    symbol: ticker,
    charts,
    notes,
    generatedAt: new Date().toISOString(),
  };
}
