export interface NiftyMover {
    symbol: string;
    lastPrice: number;
    pChange: number;
    weight: number;
}
export interface NiftyMoversResult {
    gainers: NiftyMover[];
    losers: NiftyMover[];
    asOf: string;
    /** True when weights came from the static fallback (live mcap fetch failed). */
    fallbackWeights: boolean;
}
export interface NiftyMoversArgs {
    limit?: number;
}
export declare function getNiftyMovers(args?: NiftyMoversArgs): Promise<NiftyMoversResult>;
