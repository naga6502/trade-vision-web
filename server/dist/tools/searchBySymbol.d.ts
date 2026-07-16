import type { BulkDeal, BlockDeal, InsiderTrade, NseAnnouncement } from "../types.js";
export interface SearchBySymbolArgs {
    /** NSE stock symbol, e.g. "RELIANCE", "TCS". Required. */
    symbol: string;
    /** Look back N days for insider trades and announcements. Default: 30. */
    daysBack?: number;
}
export interface SymbolSummary {
    symbol: string;
    bulkDeals: BulkDeal[];
    blockDeals: BlockDeal[];
    insiderTrades: InsiderTrade[];
    announcements: NseAnnouncement[];
}
export declare function searchBySymbol(args: SearchBySymbolArgs): Promise<SymbolSummary>;
