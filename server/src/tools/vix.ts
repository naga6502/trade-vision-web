import { getVixHistorical } from "../nse/vix.js";

export interface VixArgs {
  /** Start date YYYY-MM-DD. Default: 1 year ago. */
  from?: string;
  /** End date YYYY-MM-DD. Default: today. */
  to?: string;
}

export async function getVixHistory(args: VixArgs) {
  const to = args.to ?? new Date().toISOString().slice(0, 10);
  const from =
    args.from ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return getVixHistorical(from, to);
}
