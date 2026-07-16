export interface PriceBar {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export interface PriceHistoryArgs {
    symbol: string;
    range?: string;
}
export declare function getPriceHistory(args: PriceHistoryArgs): Promise<{
    symbol: string;
    range: string;
    bars: PriceBar[];
}>;
