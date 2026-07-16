import type { BlockDeal } from "../types.js";
export interface BlockDealsArgs {
    symbol?: string;
    dealType?: "BUY" | "SELL" | "ALL";
}
export declare function getBlockDeals(args?: BlockDealsArgs): Promise<BlockDeal[]>;
