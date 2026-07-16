export interface PressureZone {
    role: "CALL_RESISTANCE" | "PUT_SUPPORT";
    strike: number;
    oi: number;
    distancePct: number;
}
export interface OptionPressure {
    symbol: string;
    underlying: number | null;
    expiryDate: string | null;
    daysToExpiry: number | null;
    maxPain: number | null;
    gammaWall: {
        strike: number;
        exposure: number;
    } | null;
    expectedMove: {
        points: number | null;
        pct: number | null;
        method: "straddle" | "unknown";
    };
    squeezeTargets: {
        up: number | null;
        down: number | null;
    } | null;
    pressureZones: PressureZone[];
    notes: string[];
    generatedAt: string;
}
export interface OptionPressureArgs {
    /** NSE F&O symbol, e.g. RELIANCE. */
    symbol: string;
    /** Expiry date (from get_option_expiries). Defaults to the nearest expiry. */
    expiry?: string;
}
export declare function getOptionPressure(args: OptionPressureArgs): Promise<OptionPressure>;
