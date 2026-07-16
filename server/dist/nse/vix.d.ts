export interface VixPoint {
    date: string;
    close: number;
}
/**
 * Historical India VIX (volatility index) via NSE's chart-data API.
 * Verified endpoint: /api/chart-databyindex?index=INDIAVIX&indices=true
 * Field names inside grapthData vary, so parsing is defensive.
 */
export declare function getVixHistorical(from: string, to: string): Promise<VixPoint[]>;
