import { fetchNSE } from "../nse/fetch.js";

export interface BoardMeeting {
  symbol: string;
  company: string;
  purpose: string;
  meetingDate: string;
  description: string;
}

export interface BoardMeetingsArgs {
  symbol?: string;
}

// VERIFY: the obvious NSE board-meeting calendar path 404'd during probing.
// The correct endpoint may differ. Parsing is defensive so a working endpoint
// drops straight in; until then this returns [].
const BM_PATH = "/api/board-meeting-calendar";

export async function getBoardMeetings(args: BoardMeetingsArgs = {}): Promise<BoardMeeting[]> {
  try {
    const data = await fetchNSE<any>(BM_PATH, { ttlMs: 0 });
    const rows: any[] = Array.isArray(data) ? data : data?.data ?? [];
    const out = rows.map((r) => ({
      symbol: String(r.symbol ?? "").toUpperCase(),
      company: String(r.company ?? r.comp ?? ""),
      purpose: String(r.purpose ?? r.subject ?? ""),
      meetingDate: String(r.meetingDate ?? r.date ?? ""),
      description: String(r.description ?? ""),
    }));
    const sym = args.symbol?.trim().toUpperCase();
    return sym ? out.filter((m) => m.symbol === sym) : out;
  } catch {
    return [];
  }
}
