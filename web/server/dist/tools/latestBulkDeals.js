import { getBulkDeals } from "./bulkDeals.js";
export async function getLatestBulkDeals(args = {}) {
    const deals = await getBulkDeals({ dealType: args.dealType });
    // NSE bulk deals endpoint always returns today's data; daysBack is a no-op
    // hint included for API consistency — callers may pass it without error.
    return deals;
}
//# sourceMappingURL=latestBulkDeals.js.map