import type { NseIndex } from "../types.js";
export interface IndicesArgs {
    /** Filter by index name (partial, case-insensitive). E.g. "NIFTY 50", "BANK". */
    name?: string;
}
export declare function getNiftyIndices(args?: IndicesArgs): Promise<NseIndex[]>;
