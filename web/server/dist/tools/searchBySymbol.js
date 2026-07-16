import { getBulkDeals } from "./bulkDeals.js";
import { getBlockDeals } from "./blockDeals.js";
import { getInsiderTrading } from "./insiderTrading.js";
import { getAnnouncements } from "./announcements.js";
export async function searchBySymbol(args) {
    const symbol = (args.symbol ?? "").trim().toUpperCase();
    if (!symbol)
        throw new Error("symbol is required");
    const daysBack = args.daysBack ?? 30;
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    const [bulkDeals, blockDeals, insiderTrades, announcements] = await Promise.all([
        getBulkDeals({ symbol }),
        getBlockDeals({ symbol }),
        getInsiderTrading({ symbol, fromDate }),
        getAnnouncements({ symbol, daysBack }),
    ]);
    return { symbol, bulkDeals, blockDeals, insiderTrades, announcements };
}
//# sourceMappingURL=searchBySymbol.js.map