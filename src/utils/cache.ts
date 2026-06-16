/**
 * Simple in-memory cache with TTL (Time To Live) support
 */

import type { CacheEntry } from '../types/cache.js';

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 1000, defaultTTL: number = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Clean up expired entries every 5 minutes. unref() so this timer never
    // keeps the process alive on its own.
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all entries as array of [key, value] pairs
   */
  entries(): [string, unknown][] {
    const result: [string, unknown][] = [];
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= entry.ttl) {
        result.push([key, entry.data]);
      }
    }
    return result;
  }

  /**
   * Get value from cache.
   *
   * On a hit the entry is re-inserted so it becomes most-recently-used, which is
   * what makes eviction LRU rather than FIFO (a Map preserves insertion order,
   * and the eviction in set() removes the first/oldest key).
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh recency: move this key to the end of the insertion order.
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.data as T;
  }

  /**
   * Set value in cache. Evicts the least-recently-used entry when full.
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Delete first so a re-set moves the key to the end (most recently used)
    // rather than updating in place and keeping its old recency position.
    this.cache.delete(key);

    // If cache is full, evict the least-recently-used (first) entry.
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: string;
    hits: number;
    misses: number;
    } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0.00%';

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Get or set with async function
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch new data
    const data = await fetchFn();

    // Store in cache
    this.set(key, data, ttl);

    return data;
  }
}

import { CACHE_SIZE, CACHE_TTL, WWDC_CONFIG } from './constants.js';

// Create different cache instances for different types of data.
// Note: search results are not cached — the search endpoint is volatile and the
// tool degrades gracefully, so there is no searchCache.
export const apiCache = new MemoryCache(CACHE_SIZE.API_DOCS, CACHE_TTL.API_DOCS);
export const indexCache = new MemoryCache(CACHE_SIZE.FRAMEWORK_INDEX, CACHE_TTL.FRAMEWORK_INDEX);
export const technologiesCache = new MemoryCache(CACHE_SIZE.TECHNOLOGIES, CACHE_TTL.TECHNOLOGIES);
export const updatesCache = new MemoryCache(CACHE_SIZE.UPDATES, CACHE_TTL.UPDATES);
export const sampleCodeCache = new MemoryCache(CACHE_SIZE.SAMPLE_CODE, CACHE_TTL.SAMPLE_CODE);
export const technologyOverviewsCache = new MemoryCache(
  CACHE_SIZE.TECHNOLOGY_OVERVIEWS,
  CACHE_TTL.TECHNOLOGY_OVERVIEWS,
);
export const wwdcDataCache = new MemoryCache(CACHE_SIZE.WWDC_DATA, WWDC_CONFIG.CACHE_TTL);

/**
 * Generate cache key for URL-based requests
 */
export function generateUrlCacheKey(url: string, params?: Record<string, unknown>): string {
  let key = url;
  if (params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    key += `?${sortedParams}`;
  }
  return key;
}

/**
 * Generate cache key for enhanced analysis
 */
export function generateEnhancedCacheKey(
  url: string,
  options: {
    includeRelatedApis?: boolean;
    includeReferences?: boolean;
    includeSimilarApis?: boolean;
    includePlatformAnalysis?: boolean;
  },
): string {
  return generateUrlCacheKey(url, options);
}


