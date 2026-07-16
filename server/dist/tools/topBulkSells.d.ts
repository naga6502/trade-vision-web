import type { BulkDeal } from "../types.js";
export interface TopBulkSellsArgs {
    /** Number of top results to return. Default: 10. */
    limit?: number;
    symbol?: string;
}
export declare function getTopBulkSells(args?: TopBulkSellsArgs): Promise<BulkDeal[]>;
