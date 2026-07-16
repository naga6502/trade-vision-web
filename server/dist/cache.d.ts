export declare function cacheGet<T>(key: string): T | undefined;
export declare function cacheSet<T>(key: string, value: T, ttlMs: number): void;
export declare function clearCache(): void;
