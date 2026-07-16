const cache = new Map();
export function cacheGet(key) {
    const hit = cache.get(key);
    if (!hit || hit.expiresAt <= Date.now()) {
        return undefined;
    }
    return hit.value;
}
export function cacheSet(key, value, ttlMs) {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
export function clearCache() {
    cache.clear();
}
//# sourceMappingURL=cache.js.map