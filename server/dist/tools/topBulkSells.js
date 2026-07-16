import { getBulkDeals } from "./bulkDeals.js";
export async function getTopBulkSells(args = {}) {
    const limit = Math.max(1, args.limit ?? 10);
    const deals = await getBulkDeals({ symbol: args.symbol, dealType: "SELL" });
    return deals
        .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
        .slice(0, limit);
}
//# sourceMappingURL=topBulkSells.js.map