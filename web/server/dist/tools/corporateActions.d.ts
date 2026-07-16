import type { CorporateAction } from "../types.js";
export interface CorporateActionsArgs {
    symbol?: string;
    /** ISO date string YYYY-MM-DD or DD-MM-YYYY. Default: 3 months ago. */
    fromDate?: string;
    /** ISO date string YYYY-MM-DD or DD-MM-YYYY. Default: today. */
    toDate?: string;
}
export declare function getCorporateActions(args?: CorporateActionsArgs): Promise<CorporateAction[]>;
