// Remote IPO source: the local NSE scraper 404s, so live IPO data is pulled
// from the hosted Tapetide MCP `market_ipo` tool (TAPETIDE_MCP_URL / _TOKEN in
// .env.local). Records are mapped into the same Ipo shape the rest of the app
// uses, then scored by the existing computeIpoSignal engine.
//
// NOTE: the MCP caps tool output (~25k chars), so each status returns only its
// first record and the subscription/financials sub-objects are usually
// truncated. Price band, dates, issue size and lot are reliably mapped; GMP /
// subscription / financials are left null (the signal then reports LOW
// confidence, which is honest given the partial data).

import { computeIpoSignal } from "trade-vision/ipo/signal";
import type { Ipo, IpoWithSignal } from "trade-vision/ipo/types";

const MCP_URL = process.env.TAPETIDE_MCP_URL;
const MCP_TOKEN = process.env.TAPETIDE_MCP_TOKEN;

const STATUSES = ["current", "upcoming", "latest", "closed"] as const;
type RStatus = (typeof STATUSES)[number];

interface RemoteIpoRecord {
  symbol?: string;
  cmpny_name?: string;
  isin?: string;
  exchange?: string;
  type?: string;
  issue_type?: string | number;
  issue_series?: string;
  floor_price?: number | string;
  ceiling_price?: number | string;
  min_bidprice?: number | string;
  max_bidprice?: number | string;
  trading_lot?: number | string;
  min_bidqty?: number | string;
  issue_size?: number | string;
  face_value?: number | string;
  start_datetime?: string;
  end_datetime?: string;
  listing_date?: string;
  allotment_date?: string;
  sym_doc_url?: string;
  drhp_doc?: string;
  [k: string]: unknown;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateOnly(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = String(s).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function mapRecord(r: RemoteIpoRecord): Ipo {
  const floor = num(r.floor_price);
  const ceiling = num(r.ceiling_price);
  const hasBand = floor !== null && ceiling !== null;
  const priceBand = hasBand
    ? {
        min: floor as number,
        max: ceiling as number,
        kind: floor === ceiling ? ("FIXED" as const) : ("BAND" as const),
        raw: `${floor}–${ceiling}`,
      }
    : null;

  const rawSize = num(r.issue_size); // ₹
  const issueSizeCr = rawSize != null ? rawSize / 1e7 : null;
  const lotSize = num(r.min_bidqty) ?? num(r.trading_lot);

  return {
    companyName: String(r.cmpny_name ?? r.symbol ?? "Unknown").trim(),
    symbol: r.symbol ? String(r.symbol).trim() : null,
    isin: r.isin ? String(r.isin).trim() : null,
    exchange: String(r.exchange ?? "NSE").toUpperCase(),
    type: String(r.type ?? "").toUpperCase() === "SME" ? "SME" : "Mainline",
    issueType:
      r.issue_type != null
        ? String(r.issue_type)
        : r.issue_series
          ? String(r.issue_series)
          : null,
    priceBand,
    issueSizeCr,
    lotSize,
    faceValue: num(r.face_value),
    openDate: dateOnly(r.start_datetime),
    closeDate: dateOnly(r.end_datetime),
    listingDate: dateOnly(r.listing_date),
    allotmentDate: dateOnly(r.allotment_date),
    gmp: null,
    gmpPercent: null,
    gmpAsOf: null,
    subscription: null,
    financials: null,
    drhpLink: r.sym_doc_url
      ? String(r.sym_doc_url)
      : r.drhp_doc
        ? String(r.drhp_doc)
        : null,
    dataSource: "Tapetide MCP",
  };
}

function withSignal(ipo: Ipo): IpoWithSignal {
  return { ...ipo, signal: computeIpoSignal(ipo) };
}

// Strip a trailing "[TRUNCATED ...]" note the MCP appends when it caps output.
function stripTruncation(text: string): string {
  const i = text.indexOf("[TRUNCATED");
  const trimmed = i >= 0 ? text.slice(0, i).trim().replace(/,\s*$/, "") : text;
  return trimmed;
}

// Parse a JSON-RPC response that may be plain JSON or SSE-framed.
function parseBody(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("event:") || t.startsWith("data:")) {
    return t
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("\n");
  }
  return t;
}

async function callMarketIpo(status: string): Promise<RemoteIpoRecord[]> {
  if (!MCP_URL || !MCP_TOKEN) return [];
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${MCP_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "market_ipo", arguments: { status } },
      }),
      cache: "no-store",
    });
    const raw = await res.text();
    const json = JSON.parse(parseBody(raw));
    const text = json?.result?.content?.[0]?.text;
    if (!text) return [];
    const parsed = JSON.parse(stripTruncation(text));
    return Array.isArray(parsed?.data) ? (parsed.data as RemoteIpoRecord[]) : [];
  } catch {
    return [];
  }
}

export async function getRemoteIpos(status?: string): Promise<IpoWithSignal[]> {
  const statuses =
    status && (STATUSES as readonly string[]).includes(status)
      ? [status as RStatus]
      : STATUSES;
  const batches = await Promise.all(statuses.map(callMarketIpo));
  const records = batches.flat();

  const seen = new Set<string>();
  const out: IpoWithSignal[] = [];
  for (const r of records) {
    const key = `${r.symbol || ""}|${r.cmpny_name || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(withSignal(mapRecord(r)));
  }
  return out;
}

export async function getRemoteIpoBySymbol(
  query: string,
): Promise<IpoWithSignal | null> {
  const s = query.trim().toUpperCase();
  if (!s) return null;
  const all = await getRemoteIpos();
  return (
    all.find((i) => i.symbol && i.symbol.toUpperCase() === s) ??
    all.find((i) => i.companyName.toUpperCase().includes(s)) ??
    null
  );
}
