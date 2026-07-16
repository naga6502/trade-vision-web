export interface OptionLeg {
    openInterest: number;
    changeinOpenInterest: number;
    totalTradedVolume: number;
    impliedVolatility: number;
    lastPrice: number;
    change: number;
}
export interface OptionStrike {
    strikePrice: number;
    expiryDate: string;
    ce: OptionLeg | null;
    pe: OptionLeg | null;
}
export interface OptionChainSummary {
    underlying: number;
    totalCE: number;
    totalPE: number;
    totalOI: number;
    pcr: number | null;
    maxPain: number | null;
    maxPainCE: number;
    maxPainPE: number;
    maxPainTotal: number;
}
export interface OptionChain {
    symbol: string;
    underlying: number;
    expiryDates: string[];
    strikes: OptionStrike[];
    summary: OptionChainSummary;
}
export declare function getOptionChain(symbol: string, expiry?: string): Promise<OptionChain>;
export declare function getExpiryDates(symbol: string): Promise<string[]>;
export declare function getMaxPain(symbol: string, expiry?: string): Promise<number | null>;
/** Lot size for a symbol, read from the option-chain record if present. */
export declare function getFnoLots(symbol: string): Promise<number | null>;
