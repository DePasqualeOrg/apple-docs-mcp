/**
 * Cache related types
 */

/**
 * Cache entry with value and TTL
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}