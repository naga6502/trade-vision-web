import { getHolidays } from "../nse/holidays.js";
export async function getMarketHolidays(args) {
    return getHolidays(args.year);
}
//# sourceMappingURL=holidays.js.map