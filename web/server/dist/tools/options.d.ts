export interface OptionChainArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
    /** Expiry date (from get_option_expiries). Defaults to the nearest expiry. */
    expiry?: string;
}
export declare function getOptionChainTool(args: OptionChainArgs): Promise<import("../options/optionChain.js").OptionChain>;
export declare function getOptionExpiries(args: {
    symbol: string;
}): Promise<string[]>;
export declare function getMaxPainTool(args: OptionChainArgs): Promise<number | null>;
export declare function getFnoLotsTool(args: {
    symbol: string;
}): Promise<number | null>;
