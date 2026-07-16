export type ScreenerType = "momentum" | "breakout" | "intraday" | "swing" | "mean-reversion" | "volatility" | "sector-rotation" | "accumulation" | "all";
export interface ScreenerRule {
    name: ScreenerType | string;
    description: string;
    scoreWeight: number;
    conditions: string[];
}
export interface ScreenerIndicators {
    rsi?: number;
    adx?: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
    atr?: number;
    bbWidth?: number;
    volumeAvg?: number;
    volumeCurrent?: number;
    volRatio?: number;
}
export interface ScreenerResult {
    symbol: string;
    name?: string;
    screenName: string;
    score: number;
    reason: string;
    trend: "UP" | "DOWN" | "SIDEWAYS";
    momentum: "STRONG" | "WEAK" | "NEUTRAL";
    volume: "HIGH" | "NORMAL" | "LOW";
    risk: "LOW" | "MEDIUM" | "HIGH";
    price: number;
    changePct: number;
    indicators: ScreenerIndicators;
    pattern: string;
}
export interface ScreenerScreen {
    name: string;
    description: string;
    scoreWeight: number;
    results: ScreenerResult[];
}
export interface ScreenerOutput {
    requested: ScreenerType | "all";
    screens: ScreenerScreen[];
    universeSize: number;
    generatedAt: string;
}
export interface ScreenerArgs {
    screenType?: ScreenerType;
    symbols?: string[];
    limit?: number;
    sector?: string;
    minVolume?: number;
}
export declare function getScreenerRegistry(): ScreenerRule[];
export declare function runScreener(args: ScreenerArgs): Promise<ScreenerOutput>;
