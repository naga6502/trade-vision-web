import { getOptionChain, getExpiryDates, getMaxPain, getFnoLots, } from "../options/optionChain.js";
export async function getOptionChainTool(args) {
    if (!args.symbol)
        throw new Error("symbol is required");
    return getOptionChain(args.symbol, args.expiry);
}
export async function getOptionExpiries(args) {
    if (!args.symbol)
        throw new Error("symbol is required");
    return getExpiryDates(args.symbol);
}
export async function getMaxPainTool(args) {
    if (!args.symbol)
        throw new Error("symbol is required");
    return getMaxPain(args.symbol, args.expiry);
}
export async function getFnoLotsTool(args) {
    if (!args.symbol)
        throw new Error("symbol is required");
    return getFnoLots(args.symbol);
}
//# sourceMappingURL=options.js.map