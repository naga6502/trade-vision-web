export interface MarketHoliday {
    market: string;
    date: string;
    day: string;
    description: string;
}
/**
 * NSE trading/settlement holidays.
 * Verified endpoint: /api/holiday-master?type=trading
 * Response is keyed by market segment (CM, FO, CD, ...), each an array of
 * { tradingDate, weekDay, description }.
 */
export declare function getHolidays(year?: number): Promise<MarketHoliday[]>;
