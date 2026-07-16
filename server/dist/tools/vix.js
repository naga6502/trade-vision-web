import { getVixHistorical } from "../nse/vix.js";
export async function getVixHistory(args) {
    const to = args.to ?? new Date().toISOString().slice(0, 10);
    const from = args.from ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return getVixHistorical(from, to);
}
//# sourceMappingURL=vix.js.map