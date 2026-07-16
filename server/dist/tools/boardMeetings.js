import { fetchNSE } from "../nse/fetch.js";
// VERIFY: the obvious NSE board-meeting calendar path 404'd during probing.
// The correct endpoint may differ. Parsing is defensive so a working endpoint
// drops straight in; until then this returns [].
const BM_PATH = "/api/board-meeting-calendar";
export async function getBoardMeetings(args = {}) {
    try {
        const data = await fetchNSE(BM_PATH, { ttlMs: 0 });
        const rows = Array.isArray(data) ? data : data?.data ?? [];
        const out = rows.map((r) => ({
            symbol: String(r.symbol ?? "").toUpperCase(),
            company: String(r.company ?? r.comp ?? ""),
            purpose: String(r.purpose ?? r.subject ?? ""),
            meetingDate: String(r.meetingDate ?? r.date ?? ""),
            description: String(r.description ?? ""),
        }));
        const sym = args.symbol?.trim().toUpperCase();
        return sym ? out.filter((m) => m.symbol === sym) : out;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=boardMeetings.js.map