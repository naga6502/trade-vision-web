import { getIpoCalendar as engineCalendar, getIpoDetails as engineDetails } from "../ipo/index.js";
export { getPastIpos, getIpoProspectus } from "../ipo/index.js";
export async function getIpoCalendar(args) {
    const status = args.status ?? "current";
    const limit = typeof args.limit === "number" ? args.limit : 20;
    return engineCalendar({ status, exchange: args.exchange, limit });
}
export async function getIpoDetails(args) {
    if (!args.symbol && !args.companyName) {
        throw new Error("symbol or companyName is required");
    }
    return engineDetails({ symbol: args.symbol, companyName: args.companyName });
}
//# sourceMappingURL=ipo.js.map