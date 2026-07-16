import type { FiiDiiActivity } from "../types.js";
export interface FiiDiiActivityArgs {
    /** Number of recent trading days to return. Default: 10. */
    limit?: number;
}
export declare function getFiiDiiActivity(args?: FiiDiiActivityArgs): Promise<FiiDiiActivity[]>;
