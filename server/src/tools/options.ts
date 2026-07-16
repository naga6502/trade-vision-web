import {
  getOptionChain,
  getExpiryDates,
  getMaxPain,
  getFnoLots,
} from "../options/optionChain.js";

export interface OptionChainArgs {
  /** NSE symbol, e.g. RELIANCE. */
  symbol: string;
  /** Expiry date (from get_option_expiries). Defaults to the nearest expiry. */
  expiry?: string;
}

export async function getOptionChainTool(args: OptionChainArgs) {
  if (!args.symbol) throw new Error("symbol is required");
  return getOptionChain(args.symbol, args.expiry);
}

export async function getOptionExpiries(args: { symbol: string }) {
  if (!args.symbol) throw new Error("symbol is required");
  return getExpiryDates(args.symbol);
}

export async function getMaxPainTool(args: OptionChainArgs) {
  if (!args.symbol) throw new Error("symbol is required");
  return getMaxPain(args.symbol, args.expiry);
}

export async function getFnoLotsTool(args: { symbol: string }) {
  if (!args.symbol) throw new Error("symbol is required");
  return getFnoLots(args.symbol);
}
