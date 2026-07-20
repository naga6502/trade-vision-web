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
    /**
     * Whether the metric set is statistically meaningful. false when there are
     * too few completed round-trips for win rate / trade stats to be trusted
     * (the strategy signalled but barely traded). Always true for always-long
     * strategies like buy & hold, which have real reportable performance.
     */
    reliable: boolean;
}
/** Minimum completed round-trips before win-rate / trade stats are trusted. */
export declare const MIN_RELIABLE_TRADES = 5;
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
