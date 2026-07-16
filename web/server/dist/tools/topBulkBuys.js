import { getBulkDeals } from "./bulkDeals.js";
export async function getTopBulkBuys(args = {}) {
    const limit = Math.max(1, args.limit ?? 10);
    const deals = await getBulkDeals({ symbol: args.symbol, dealType: "BUY" });
    return deals
        .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
        .slice(0, limit);
}
//# sourceMappingURL=topBulkBuys.js.map