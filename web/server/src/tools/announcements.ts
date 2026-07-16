import { fetchNSE } from "../nse/fetch.js";
import type { NseAnnouncement } from "../types.js";

export interface AnnouncementsArgs {
  symbol?: string;
  /** Return only announcements from the last N days. Default: no filter. */
  daysBack?: number;
  /** Maximum number of results. Default: 20. */
  limit?: number;
}

interface NseAnnouncementRow {
  symbol?: string;
  sm_name?: string;
  desc?: string;
  attchmntText?: string;
  bDt?: string;
  sort_date?: number;
  attchmntFile?: string;
}

interface NseAnnouncementsResponse {
  data?: NseAnnouncementRow[];
}

const PDF_BASE = "https://archives.nseindia.com/corporate/ANNC/";

function parseRow(row: NseAnnouncementRow): NseAnnouncement {
  const file = (row.attchmntFile ?? "").trim();
  return {
    symbol: (row.symbol ?? "").trim().toUpperCase(),
    company: (row.sm_name ?? "").trim(),
    description: (row.desc ?? row.attchmntText ?? "").trim(),
    broadcastDateTime: (row.bDt ?? "").trim(),
    pdfLink: file ? `${PDF_BASE}${file}` : undefined,
  };
}

function parseDateMs(row: NseAnnouncementRow): number {
  if (typeof row.sort_date === "number" && row.sort_date > 0) return row.sort_date;
  if (row.bDt) {
    const ts = Date.parse(row.bDt);
    if (!isNaN(ts)) return ts;
  }
  return 0;
}

export async function getAnnouncements(args: AnnouncementsArgs = {}): Promise<NseAnnouncement[]> {
  const resp = await fetchNSE<NseAnnouncementsResponse>(
    "/api/home-corporate-announcements?index=equities",
    { ttlMs: 60_000 },
  );

  const cutoffMs =
    args.daysBack && args.daysBack > 0
      ? Date.now() - args.daysBack * 24 * 60 * 60 * 1000
      : 0;

  const symbolFilter = args.symbol?.trim().toUpperCase();
  const limit = Math.max(1, args.limit ?? 20);

  const rows = resp.data ?? [];
  return rows
    .filter((r) => {
      if (symbolFilter && (r.symbol ?? "").trim().toUpperCase() !== symbolFilter) return false;
      if (cutoffMs > 0 && parseDateMs(r) < cutoffMs) return false;
      return true;
    })
    .slice(0, limit)
    .map(parseRow);
}
