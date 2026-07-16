import { type IpoStatus } from "./nse.js";
import type { Ipo, IpoSignal, IpoWithSignal } from "./types.js";
export interface IpoCalendarArgs {
    status?: IpoStatus;
    exchange?: string;
    limit?: number;
}
export interface IpoDetailsArgs {
    symbol?: string;
    companyName?: string;
    status?: IpoStatus;
}
export declare function getIpoCalendar(args?: IpoCalendarArgs): Promise<IpoWithSignal[]>;
export declare function getIpoDetails(args: IpoDetailsArgs): Promise<IpoWithSignal | null>;
export type { Ipo, IpoSignal, IpoWithSignal, IpoStatus };
/** Past IPOs within an optional date window (filters latest + closed). */
export declare function getPastIpos(args?: {
    from?: string;
    to?: string;
    limit?: number;
}): Promise<IpoWithSignal[]>;
export interface IpoProspectus {
    symbol: string;
    drhpUrl: string | null;
    rhpUrl: string | null;
}
/**
 * Best-effort DRHP/RHP prospectus links for an IPO. We hit NSE's IPO detail
 * endpoint and scan the payload for .pdf links. VERIFY endpoint + field names
 * on first live run; NSE may require the option-chain-style cookie priming.
 */
export declare function getIpoProspectus(symbol: string): Promise<IpoProspectus>;
