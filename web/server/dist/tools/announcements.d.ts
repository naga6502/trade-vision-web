import type { NseAnnouncement } from "../types.js";
export interface AnnouncementsArgs {
    symbol?: string;
    /** Return only announcements from the last N days. Default: no filter. */
    daysBack?: number;
    /** Maximum number of results. Default: 20. */
    limit?: number;
}
export declare function getAnnouncements(args?: AnnouncementsArgs): Promise<NseAnnouncement[]>;
