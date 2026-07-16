import type { InsiderTrade } from "../types.js";
export interface InsiderTradingArgs {
    symbol?: string;
    /** ISO date string YYYY-MM-DD or DD-MM-YYYY */
    fromDate?: string;
    /** ISO date string YYYY-MM-DD or DD-MM-YYYY */
    toDate?: string;
}
export declare function getInsiderTrading(args?: InsiderTradingArgs): Promise<InsiderTrade[]>;
