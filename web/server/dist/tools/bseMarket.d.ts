export interface BseQuote {
    scrip: string;
    lastPrice: number;
    previousClose: number;
    change: number;
    pChange: number;
}
export declare function getBseQuote(scrip: string): Promise<BseQuote | null>;
export interface BseMover {
    scrip: string;
    name: string;
    lastPrice: number;
    pChange: number;
}
export declare function getBseGainers(): Promise<BseMover[]>;
export declare function getBseLosers(): Promise<BseMover[]>;
export interface BseAdvanceDecline {
    index: string;
    advances: number;
    declines: number;
    unchanged: number;
}
export declare function getBseAdvanceDecline(): Promise<BseAdvanceDecline[]>;
export declare function getBseResultCalendar(): Promise<any[]>;
