export interface HolidaysArgs {
    /** Calendar year. Default: current year. */
    year?: number;
}
export declare function getMarketHolidays(args: HolidaysArgs): Promise<import("../nse/holidays.js").MarketHoliday[]>;
