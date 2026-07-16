import type { NseStock } from "../types.js";
export interface MostActiveArgs {
    /**
     * NSE index to scan. Default: "NIFTY 500".
     * Other options: "NIFTY 50", "NIFTY NEXT 50", "NIFTY BANK", etc.
     */
    index?: string;
    /** Number of top results to return. Default: 10. */
    limit?: number;
}
export declare function getMostActive(args?: MostActiveArgs): Promise<NseStock[]>;
