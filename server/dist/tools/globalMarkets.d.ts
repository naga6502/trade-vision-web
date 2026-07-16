export interface GlobalIndex {
    symbol: string;
    name: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    currency: string;
}
export interface GlobalMarketsArgs {
    symbols?: string[];
}
export declare function getGlobalMarkets(args?: GlobalMarketsArgs): Promise<GlobalIndex[]>;
