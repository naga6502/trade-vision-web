import type { GmpEnrichment } from "./types.js";
export interface GmpSource {
    name: string;
    fetch(symbol?: string | null, companyName?: string | null): Promise<GmpEnrichment | null>;
}
export declare function fetchEnrichment(symbol?: string | null, companyName?: string | null): Promise<GmpEnrichment | null>;
