import type { NseStock } from "../types.js";
export interface TopGainersArgs {
    /**
     * Market segment to scan. Maps to a category from the NSE live-analysis
     * endpoint (NIFTY, BANKNIFTY, NIFTYNEXT50, FOSec). Omit for all securities.
     * Default: all securities.
     */
    index?: string;
    /** Number of top results to return. Default: 10. */
    limit?: number;
}
export declare function getTopGainers(args?: TopGainersArgs): Promise<NseStock[]>;
