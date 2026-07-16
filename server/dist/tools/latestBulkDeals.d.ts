import type { BulkDeal } from "../types.js";
export interface LatestBulkDealsArgs {
    /** Return only deals within the last N calendar days. Default: today only (1). */
    daysBack?: number;
    dealType?: "BUY" | "SELL" | "ALL";
}
export declare function getLatestBulkDeals(args?: LatestBulkDealsArgs): Promise<BulkDeal[]>;
