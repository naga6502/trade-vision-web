export interface IvSmilePoint {
    strike: number;
    iv: number | null;
}
export interface IvRadar {
    symbol: string;
    underlying: number | null;
    expiry: string | null;
    atmIv: number | null;
    ivRank: number | null;
    ivPercentile: number | null;
    riskReversal: number | null;
    volatilityRegime: "ELEVATED" | "NORMAL" | "COMPRESSED" | "UNKNOWN";
    realizedVol21d: number | null;
    smile: IvSmilePoint[];
    notes: string[];
    generatedAt: string;
}
export interface IvRadarArgs {
    /** NSE F&O symbol, e.g. RELIANCE. */
    symbol: string;
    /** Expiry date (from get_option_expiries). Defaults to the nearest expiry. */
    expiry?: string;
}
export declare function getIvRadar(args: IvRadarArgs): Promise<IvRadar>;
