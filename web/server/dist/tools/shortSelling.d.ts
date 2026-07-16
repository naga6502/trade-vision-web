import type { ShortSellData } from "../types.js";
export interface ShortSellingArgs {
    symbol?: string;
    /** Number of top results by short-sold quantity. Default: no limit. */
    limit?: number;
}
export declare function getShortSelling(args?: ShortSellingArgs): Promise<ShortSellData[]>;
