export interface DistributionBucket {
    bucketLow: number;
    bucketHigh: number;
    count: number;
    prob: number;
}
export interface MonteCarloResult {
    symbol: string;
    spot: number;
    horizonDays: number;
    paths: number;
    meanPrice: number;
    medianPrice: number;
    range90: [number, number];
    range68: [number, number];
    probAboveSpot: number;
    prob10PctDrop: number;
    expectedAnnualDriftPct: number;
    annualVolPct: number;
    distribution: DistributionBucket[];
    generatedAt: string;
}
export interface MonteCarloArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
    /** Forecast horizon in trading days. Default: 30. */
    horizonDays?: number;
    /** Number of simulated paths. Default: 10000. */
    paths?: number;
    /** Trailing window (days) used to estimate drift/vol. Default: 365. */
    historicalDays?: number;
}
export declare function getMonteCarlo(args: MonteCarloArgs): Promise<MonteCarloResult>;
