export type Signal = "BUY" | "SELL" | "NEUTRAL";
export interface TechSignal {
    name: string;
    value: string;
    signal: Signal;
}
export interface TechnicalSummary {
    label: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
    score: number;
    buy: number;
    neutral: number;
    sell: number;
}
export interface Technical {
    symbol: string;
    price: number;
    /** Price at which the current BUY/SELL/NEUTRAL verdict first triggered. */
    triggerPrice: number;
    /** ISO date (YYYY-MM-DD) of the bar where the verdict triggered, if known. */
    triggerDate?: string;
    /** Confluence-based trade plan: where to buy/sell, stop and target. */
    confluence: ConfluencePlan;
    summary: TechnicalSummary;
    oscillators: TechSignal[];
    movingAverages: TechSignal[];
    volatility: {
        atr: number;
        bbWidth: number;
        histVol: number;
    };
    patterns: {
        name: string;
        type: "BULLISH" | "BEARISH" | "NEUTRAL";
    }[];
    generatedAt: string;
}
export interface TechnicalArgs {
    /** NSE symbol, e.g. RELIANCE. .NS is appended automatically. */
    symbol: string;
}
export declare function sma(arr: number[], period: number): number;
export declare function ema(arr: number[], period: number): number;
export declare function rsi(closes: number[], period?: number): number;
export declare function macd(closes: number[], fast?: number, slow?: number, signalP?: number): {
    macd: number;
    signal: number;
    hist: number;
};
export declare function adx(highs: number[], lows: number[], closes: number[], period?: number): {
    adx: number;
    plusDI: number;
    minusDI: number;
};
export declare function atr(highs: number[], lows: number[], closes: number[], period?: number): number;
export declare function bollingerWidth(closes: number[], period?: number, mult?: number): number;
type PatType = "BULLISH" | "BEARISH" | "NEUTRAL";
export type PatternConfidence = "HIGH" | "MEDIUM" | "LOW";
export interface DetectedPattern {
    name: string;
    type: PatType;
    note: string;
    forming: boolean;
    confidence?: PatternConfidence;
}
export type PatternHorizon = "intraday" | "short" | "long";
export interface PatternAnalysisRow {
    horizon: PatternHorizon;
    label: string;
    interval: string;
    bars: number;
    patterns: DetectedPattern[];
}
export type PatternAnalysis = PatternAnalysisRow[];
export declare function detectCandlePatterns(bars: any[], opts?: {
    forming?: boolean;
}): DetectedPattern[];
export interface RawBar {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    date: string;
}
export declare function fetchBars(ticker: string, interval: string, days: number): Promise<RawBar[]>;
export declare function getPatternAnalysis(args: TechnicalArgs): Promise<PatternAnalysis>;
export type ConfluenceTool = "Pivot" | "Round" | "Fib" | "MA" | "VWAP" | "VolProfile";
export interface ConfluenceLevel {
    /** Cluster centre (average of the agreeing candidate prices). */
    price: number;
    low: number;
    high: number;
    /** Number of independent tools that agree on this price (1..6). */
    strength: number;
    sources: ConfluenceTool[];
}
export interface ConfluencePlan {
    bias: "BUY" | "SELL" | "NEUTRAL";
    buyZone: ConfluenceLevel | null;
    sellZone: ConfluenceLevel | null;
    longStop: number | null;
    longTarget: number | null;
    /** Reward:risk ratio for the long setup (target vs stop from entry). */
    longRRR: number | null;
    shortStop: number | null;
    shortTarget: number | null;
    shortRRR: number | null;
    /** Top confluence clusters, strongest first, for display. */
    levels: ConfluenceLevel[];
}
export declare function computeConfluence(closes: number[], highs: number[], lows: number[], vols: number[], price: number, atr: number, bias: ConfluencePlan["bias"]): ConfluencePlan;
export declare function getTechnicalAnalysis(args: TechnicalArgs): Promise<Technical>;
export {};
