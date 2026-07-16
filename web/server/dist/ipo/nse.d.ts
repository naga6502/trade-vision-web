import type { Ipo, IpoPriceBand } from "./types.js";
export declare function parsePriceBand(raw: string | undefined): IpoPriceBand | null;
export declare function parseDate(raw: string | undefined): string | null;
export declare function parseSizeCr(raw: string | undefined): number | null;
export declare function parseCount(raw: unknown): number | null;
export type IpoStatus = "current" | "upcoming" | "latest" | "closed" | "all";
export declare function fetchNseIpos(status?: IpoStatus): Promise<Ipo[]>;
