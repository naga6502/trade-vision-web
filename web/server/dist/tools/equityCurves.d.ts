export interface EquityMetrics {
    strategy: string;
    description: string;
    cumulativeReturnPct: number;
    annualizedReturnPct: number;
    sharpe: number;
    sortino: number;
    maxDrawdownPct: number;
    winRate: number;
    numTrades: number;
    finalEquity: number;
}
export interface EquityCurvesResult {
    symbol: string;
    bars: number;
    windowDays: number;
    /** Bars before the evaluated window, used to warm up slow indicators. */
    warmupBars: number;
    strategies: EquityMetrics[];
    generatedAt: string;
}
export interface EquityCurvesArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
    /** Trailing window (days) for the backtest. Default: 365. */
    windowDays?: number;
}
export declare function getEquityCurves(args: EquityCurvesArgs): Promise<EquityCurvesResult>;
