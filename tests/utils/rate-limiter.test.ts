/**
 * Tests for the request rate limiter.
 *
 * The limiter applies backpressure: acquire() resolves immediately while the
 * window has capacity and otherwise waits until the oldest request ages out.
 */

import { RateLimiter } from '../../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  it('resolves immediately while under capacity and tracks usage', async () => {
    const limiter = new RateLimiter(3, 1000);

    await limiter.acquire();
    await limiter.acquire();

    const stats = limiter.getStats();
    expect(stats.currentRequests).toBe(2);
    expect(stats.maxRequests).toBe(3);
  });

  it('blocks until the window frees when at capacity', async () => {
    const windowMs = 80;
    const limiter = new RateLimiter(1, windowMs);

    await limiter.acquire(); // fills the single slot

    const start = Date.now();
    await limiter.acquire(); // must wait for the first request to age out
    const waited = Date.now() - start;

    // Lower bound with margin for timer imprecision; the true wait is ~windowMs.
    expect(waited).toBeGreaterThanOrEqual(windowMs - 25);
  });

  it('reset clears the window', async () => {
    const limiter = new RateLimiter(1, 1000);
    await limiter.acquire();
    expect(limiter.getStats().currentRequests).toBe(1);

    limiter.reset();
    expect(limiter.getStats().currentRequests).toBe(0);

    // A slot is immediately available again.
    await limiter.acquire();
    expect(limiter.getStats().currentRequests).toBe(1);
  });
});
