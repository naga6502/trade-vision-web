import type { IpoWithSignal } from "../ipo/types.js";
export { getPastIpos, getIpoProspectus } from "../ipo/index.js";
export type { IpoProspectus } from "../ipo/index.js";
export interface IpoCalendarArgs {
    status?: string;
    exchange?: string;
    limit?: number;
}
export interface IpoDetailsArgs {
    symbol?: string;
    companyName?: string;
}
export declare function getIpoCalendar(args: IpoCalendarArgs): Promise<IpoWithSignal[]>;
export declare function getIpoDetails(args: IpoDetailsArgs): Promise<IpoWithSignal | null>;
