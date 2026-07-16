import { getHolidays } from "../nse/holidays.js";

export interface HolidaysArgs {
  /** Calendar year. Default: current year. */
  year?: number;
}

export async function getMarketHolidays(args: HolidaysArgs) {
  return getHolidays(args.year);
}
