import { cacheGet, cacheSet } from "./cache.js";
const DEFAULT_TIMEOUT_MS = 30_000;
class TransientError extends Error {
}
const nextSlotByName = new Map();
async function paceSlot(name, minIntervalMs) {
    if (minIntervalMs <= 0)
        return;
    const now = Date.now();
    const next = nextSlotByName.get(name) ?? 0;
    const wait = Math.max(0, next - now);
    nextSlotByName.set(name, Math.max(now, next) + minIntervalMs);
    if (wait > 0)
        await new Promise((r) => setTimeout(r, wait));
}
async function doFetch(url, config, options, asBinary) {
    await paceSlot(config.name, config.minIntervalMs ?? 0);
    const accept = options.accept ?? config.defaultAccept;
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let res;
    try {
        res = await fetch(url, {
            headers: {
                "User-Agent": config.userAgent,
                Accept: accept,
                ...(options.headers ?? {}),
            },
            signal: AbortSignal.timeout(timeoutMs),
        });
    }
    catch (err) {
        if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
            throw new Error(`${config.name} timed out after ${timeoutMs}ms for ${url}`);
        }
        throw err;
    }
    if (res.status >= 500) {
        throw new TransientError(`${config.name} returned ${res.status} for ${url}`);
    }
    const nullStatuses = options.nullStatuses ?? config.defaultNullStatuses ?? [];
    if (nullStatuses.includes(res.status))
        return null;
    if (!res.ok) {
        throw new Error(`${config.name} returned ${res.status} for ${url}`);
    }
    return asBinary ? await res.arrayBuffer() : await res.text();
}
async function fetchWithRetry(url, config, options, asBinary) {
    try {
        return await doFetch(url, config, options, asBinary);
    }
    catch (err) {
        if (err instanceof TransientError) {
            return await doFetch(url, config, options, asBinary);
        }
        throw err;
    }
}
export async function fetchHttp(url, config, options = {}) {
    const useCache = options.cache !== false;
    const ttl = options.ttlMs ?? config.defaultTtlMs;
    if (useCache) {
        const hit = cacheGet(url);
        if (hit !== undefined)
            return hit;
    }
    const text = (await fetchWithRetry(url, config, options, false));
    if (text === null)
        return null;
    if (useCache)
        cacheSet(url, text, ttl);
    return text;
}
//# sourceMappingURL=http.js.map