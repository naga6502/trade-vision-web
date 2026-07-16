import type { BulkDeal } from "../types.js";
export interface TopBulkBuysArgs {
    /** Number of top results to return. Default: 10. */
    limit?: number;
    symbol?: string;
}
export declare function getTopBulkBuys(args?: TopBulkBuysArgs): Promise<BulkDeal[]>;
