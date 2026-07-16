export interface ChartFile {
    type: "candlestick" | "iv_surface" | "options_flow";
    title: string;
    path: string;
    svg: string;
}
export interface StockImagesResult {
    symbol: string;
    charts: ChartFile[];
    notes: string[];
    generatedAt: string;
}
export interface StockImagesArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
    /** Number of trailing daily bars for the candlestick chart. Default: 60. */
    bars?: number;
}
export declare function generateStockImages(args: StockImagesArgs): Promise<StockImagesResult>;
