import type { BulkDeal } from "../types.js";
export interface BulkDealsArgs {
    symbol?: string;
    dealType?: "BUY" | "SELL" | "ALL";
}
export declare function getBulkDeals(args?: BulkDealsArgs): Promise<BulkDeal[]>;
