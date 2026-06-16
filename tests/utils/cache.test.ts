import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MemoryCache } from '../../src/utils/cache.js';

describe('Cache System', () => {
  describe('MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache(3, 1000); // Small cache for testing
    });

    afterEach(() => {
      cache.clear();
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should respect TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should handle has() method correctly', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.size()).toBe(0);
    });

    it('should respect max size and evict oldest entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.size()).toBe(3);
    });

    it('should evict least-recently-used, not first-inserted (LRU, not FIFO)', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Read key1 so it becomes most-recently-used. Under FIFO it would still be
      // the next to go; under LRU key2 (now the oldest unused) is evicted instead.
      expect(cache.get('key1')).toBe('value1');

      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1'); // survived because it was read
      expect(cache.get('key2')).toBeUndefined(); // evicted as least-recently-used
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should refresh recency when an existing key is re-set', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Re-setting key1 moves it to most-recently-used.
      cache.set('key1', 'value1-updated');

      cache.set('key4', 'value4'); // evicts key2 (now the oldest)

      expect(cache.get('key1')).toBe('value1-updated');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.size()).toBe(3);
    });

    it('should return correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('should get all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const entries = cache.entries();
      
      expect(entries).toHaveLength(2);
      expect(entries.find(e => e[0] === 'key1')?.[1]).toBe('value1');
      expect(entries.find(e => e[0] === 'key2')?.[1]).toBe('value2');
    });

    it('should handle cleanup of expired entries', async () => {
      const cleanupSpy = jest.spyOn(cache as any, 'cleanup');
      
      // Create a new cache with shorter cleanup interval
      const testCache = new MemoryCache(10, 1000);
      
      // Set some entries with short TTL
      testCache.set('key1', 'value1', 50);
      testCache.set('key2', 'value2', 50);
      
      // Wait for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(testCache.get('key1')).toBeUndefined();
      expect(testCache.get('key2')).toBeUndefined();
      
      testCache.clear();
    });
  });

});