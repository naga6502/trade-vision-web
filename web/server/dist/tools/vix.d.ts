export interface VixArgs {
    /** Start date YYYY-MM-DD. Default: 1 year ago. */
    from?: string;
    /** End date YYYY-MM-DD. Default: today. */
    to?: string;
}
export declare function getVixHistory(args: VixArgs): Promise<import("../nse/vix.js").VixPoint[]>;
