export interface DailyBar {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export declare function normalizeSymbol(raw: string): string;
export declare function validateSymbol(raw: string): string;
export declare function fetchDailyBars(ticker: string, days: number): Promise<{
    ticker: string;
    bars: DailyBar[];
}>;
export declare function logReturns(closes: number[]): number[];
export declare function mean(arr: number[]): number;
export declare function std(arr: number[], sample?: boolean): number;
export declare function annualizedVol(closes: number[], periods?: number): number;
export declare function percentile(arr: number[], p: number): number;
export declare function randn(): number;
export declare function clamp(x: number, lo: number, hi: number): number;
export declare function round(x: number, dp?: number): number;
