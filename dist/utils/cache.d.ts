/**
 * Simple in-memory cache with TTL (Time To Live) support
 */
export declare class MemoryCache {
    private cache;
    private maxSize;
    private defaultTTL;
    private hits;
    private misses;
    constructor(maxSize?: number, defaultTTL?: number);
    /**
     * Get the current size of the cache
     */
    size(): number;
    /**
     * Get all entries as array of [key, value] pairs
     */
    entries(): [string, unknown][];
    /**
     * Get value from cache.
     *
     * On a hit the entry is re-inserted so it becomes most-recently-used, which is
     * what makes eviction LRU rather than FIFO (a Map preserves insertion order,
     * and the eviction in set() removes the first/oldest key).
     */
    get<T>(key: string): T | undefined;
    /**
     * Set value in cache. Evicts the least-recently-used entry when full.
     */
    set<T>(key: string, value: T, ttl?: number): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete entry from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Clean up expired entries
     */
    private cleanup;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: string;
        hits: number;
        misses: number;
    };
    /**
     * Get or set with async function
     */
    getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T>;
}
export declare const apiCache: MemoryCache;
export declare const indexCache: MemoryCache;
export declare const technologiesCache: MemoryCache;
export declare const updatesCache: MemoryCache;
export declare const sampleCodeCache: MemoryCache;
export declare const technologyOverviewsCache: MemoryCache;
export declare const wwdcDataCache: MemoryCache;
/**
 * Generate cache key for URL-based requests
 */
export declare function generateUrlCacheKey(url: string, params?: Record<string, unknown>): string;
/**
 * Generate cache key for enhanced analysis
 */
export declare function generateEnhancedCacheKey(url: string, options: {
    includeRelatedApis?: boolean;
    includeReferences?: boolean;
    includeSimilarApis?: boolean;
    includePlatformAnalysis?: boolean;
}): string;
//# sourceMappingURL=cache.d.ts.map