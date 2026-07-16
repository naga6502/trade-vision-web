export interface NseFetchOptions {
    ttlMs?: number;
    noCache?: boolean;
}
export declare function fetchNSE<T>(path: string, options?: NseFetchOptions): Promise<T>;
