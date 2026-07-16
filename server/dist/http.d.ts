export interface HttpFetchOptions {
    /** Skip the cache for this call. Default: cache enabled. */
    cache?: boolean;
    /** Override the source's default cache TTL. */
    ttlMs?: number;
    /** Override the source's default Accept header. */
    accept?: string;
    /**
     * HTTP statuses that resolve to `null` instead of throwing.
     * Used e.g. when 404 means "not found" rather than "error".
     */
    nullStatuses?: number[];
    /** Extra headers merged after the source defaults. */
    headers?: Record<string, string>;
}
export interface SourceConfig {
    name: string;
    userAgent: string;
    defaultTtlMs: number;
    defaultAccept: string;
    minIntervalMs?: number;
    timeoutMs?: number;
    defaultNullStatuses?: number[];
}
export declare function fetchHttp(url: string, config: SourceConfig, options?: HttpFetchOptions): Promise<string | null>;
