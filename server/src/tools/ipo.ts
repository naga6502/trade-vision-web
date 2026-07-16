import { getIpoCalendar as engineCalendar, getIpoDetails as engineDetails } from "../ipo/index.js";
import type { IpoStatus } from "../ipo/nse.js";
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

export async function getIpoCalendar(
  args: IpoCalendarArgs
): Promise<IpoWithSignal[]> {
  const status = (args.status as IpoStatus) ?? "current";
  const limit = typeof args.limit === "number" ? args.limit : 20;
  return engineCalendar({ status, exchange: args.exchange, limit });
}

export async function getIpoDetails(
  args: IpoDetailsArgs
): Promise<IpoWithSignal | null> {
  if (!args.symbol && !args.companyName) {
    throw new Error("symbol or companyName is required");
  }
  return engineDetails({ symbol: args.symbol, companyName: args.companyName });
}
