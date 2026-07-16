import { fetchNseIpos, type IpoStatus } from "./nse.js";
import { fetchEnrichment } from "./aggregators.js";
import { computeIpoSignal } from "./signal.js";
import { fetchNSE } from "../nse/fetch.js";
import type { Ipo, IpoSignal, IpoWithSignal } from "./types.js";

export interface IpoCalendarArgs {
  status?: IpoStatus;
  exchange?: string;
  limit?: number;
}

export interface IpoDetailsArgs {
  symbol?: string;
  companyName?: string;
  status?: IpoStatus;
}

/** Attach GMP / subscription / financials from the aggregator layer. */
async function enrich(ipo: Ipo): Promise<Ipo> {
  const e = await fetchEnrichment(ipo.symbol, ipo.companyName);
  if (!e) return ipo;
  return {
    ...ipo,
    gmp: e.gmp ?? ipo.gmp,
    gmpPercent: e.gmpPercent ?? ipo.gmpPercent,
    gmpAsOf: e.gmpAsOf ?? ipo.gmpAsOf,
    subscription: e.subscription ?? ipo.subscription,
    financials: e.financials ?? ipo.financials,
    dataSource: "NSE+aggregator",
  };
}

function withSignal(ipo: Ipo): IpoWithSignal {
  return { ...ipo, signal: computeIpoSignal(ipo) };
}

export async function getIpoCalendar(args: IpoCalendarArgs = {}): Promise<IpoWithSignal[]> {
  const status = args.status ?? "current";
  let ipos = await fetchNseIpos(status);
  if (args.exchange) {
    const ex = args.exchange.toUpperCase();
    ipos = ipos.filter((i) => i.exchange.toUpperCase().includes(ex));
  }
  const limit = args.limit ?? 20;
  ipos = ipos.slice(0, limit);
  const enriched = await Promise.all(ipos.map(enrich));
  return enriched.map(withSignal);
}

async function findIpo(symbol?: string, companyName?: string): Promise<Ipo | null> {
  const statuses: IpoStatus[] = ["current", "upcoming", "latest", "closed"];
  const all = (await Promise.all(statuses.map((s) => fetchNseIpos(s)))).flat();
  const ns = (symbol ?? "").trim().toUpperCase();
  const nn = (companyName ?? "").trim().toLowerCase();
  return (
    all.find((i) => {
      if (ns && i.symbol && i.symbol.toUpperCase() === ns) return true;
      if (nn && i.companyName.toLowerCase().includes(nn)) return true;
      return false;
    }) ?? null
  );
}

export async function getIpoDetails(
  args: IpoDetailsArgs
): Promise<IpoWithSignal | null> {
  const ipo = await findIpo(args.symbol, args.companyName);
  if (!ipo) return null;
  const enriched = await enrich(ipo);
  return withSignal(enriched);
}

export type { Ipo, IpoSignal, IpoWithSignal, IpoStatus };

/** Past IPOs within an optional date window (filters latest + closed). */
export async function getPastIpos(
  args: { from?: string; to?: string; limit?: number } = {},
): Promise<IpoWithSignal[]> {
  const all = (await Promise.all([fetchNseIpos("latest"), fetchNseIpos("closed")])).flat();
  const from = args.from ? new Date(args.from).getTime() : -Infinity;
  const to = args.to ? new Date(args.to).getTime() : Infinity;
  const inRange = all.filter((i) => {
    const d = i.listingDate || i.closeDate;
    if (!d) return false;
    const t = new Date(d).getTime();
    return t >= from && t <= to;
  });
  const limit = args.limit ?? 50;
  const enriched = await Promise.all(inRange.slice(0, limit).map(enrich));
  return enriched.map(withSignal);
}

export interface IpoProspectus {
  symbol: string;
  drhpUrl: string | null;
  rhpUrl: string | null;
}

/**
 * Best-effort DRHP/RHP prospectus links for an IPO. We hit NSE's IPO detail
 * endpoint and scan the payload for .pdf links. VERIFY endpoint + field names
 * on first live run; NSE may require the option-chain-style cookie priming.
 */
export async function getIpoProspectus(symbol: string): Promise<IpoProspectus> {
  const sym = symbol.trim().toUpperCase();
  try {
    const data = await fetchNSE<any>(`/api/ipo-details/${encodeURIComponent(sym)}`, {
      ttlMs: 0,
    });
    const text = JSON.stringify(data ?? {});
    const urls = [...text.matchAll(/https?:\/\/[^"')\s]+\.pdf/gi)].map((m) => m[0]);
    const drhp = urls.find((u) => /drhp/i.test(u)) ?? urls[0] ?? null;
    const rhp = urls.find((u) => /rhp/i.test(u)) ?? null;
    return { symbol: sym, drhpUrl: drhp, rhpUrl: rhp };
  } catch {
    return { symbol: sym, drhpUrl: null, rhpUrl: null };
  }
}
