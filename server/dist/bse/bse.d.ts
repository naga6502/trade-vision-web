export declare function fetchBSE<T>(path: string, options?: {
    ttlMs?: number;
    noCache?: boolean;
}): Promise<T>;
