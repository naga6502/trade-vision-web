export interface PretradeRiskScan {
    symbol: string;
    entryPrice: number;
    currentPrice: number;
    liquidity: {
        averageVolume: number | null;
        averageDailyValue: number | null;
        liquidityScore: "HIGH" | "MEDIUM" | "LOW";
    };
    volatility: {
        atr: number;
        atrPct: number;
        annualizedVolPct: number;
        beta: number | null;
    };
    stopLoss: {
        suggestedPrice: number;
        riskPerShare: number;
        stopMultiple: number;
    };
    positionSizing: {
        riskRupees: number;
        maxShares: number;
        maxNotional: number;
        maxLots: number | null;
    };
    gapRiskPct: number;
    earningsInDays: number | null;
    impliedMovePct: number | null;
    recommendation: "PROCEED" | "PROCEED_WITH_STOP" | "REDUCE_SIZE" | "AVOID";
    flags: string[];
    generatedAt: string;
}
export interface PretradeRiskArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
    /** Planned entry price. Defaults to the current market price. */
    entryPrice?: number;
    /** Capital (₹) you are willing to risk on the trade. Default: 25000. */
    riskRupees?: number;
    /** Stop distance in ATR units. Default: 2. */
    stopMultiple?: number;
}
export declare function getPretradeRiskScan(args: PretradeRiskArgs): Promise<PretradeRiskScan>;
