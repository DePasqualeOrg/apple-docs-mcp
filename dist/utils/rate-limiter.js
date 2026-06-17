/**
 * Rate limiter for API requests
 */
import { RATE_LIMIT } from './constants.js';
export class RateLimiter {
    requests = [];
    maxRequests;
    windowMs;
    constructor(maxRequests = RATE_LIMIT.MAX_REQUESTS_PER_MINUTE, windowMs = RATE_LIMIT.WINDOW_MS) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    /**
     * Reserve a request slot, waiting if the window is currently full.
     *
     * This applies backpressure (the caller awaits) rather than throwing, so a
     * burst is paced instead of failing. With the HTTP client's small concurrency
     * cap the limiter rarely trips; when it does, callers wait until the oldest
     * in-window request ages out.
     */
    async acquire() {
        for (;;) {
            const now = Date.now();
            // Remove old requests outside the time window
            this.requests = this.requests.filter(time => now - time < this.windowMs);
            if (this.requests.length < this.maxRequests) {
                this.requests.push(now);
                return;
            }
            // Wait until the oldest in-window request expires, then re-check.
            // `oldest` is defined here (the window is full, so at least one request
            // exists); the fallback guards a misconfigured maxRequests of 0.
            const oldest = this.requests[0] ?? now;
            const waitMs = this.windowMs - (now - oldest) + 1;
            await new Promise(resolve => setTimeout(resolve, Math.max(waitMs, 0)));
        }
    }
    /**
     * Get current usage statistics
     */
    getStats() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return {
            currentRequests: this.requests.length,
            maxRequests: this.maxRequests,
            windowMs: this.windowMs,
            utilizationRate: ((this.requests.length / this.maxRequests) * 100).toFixed(2) + '%',
        };
    }
    /**
     * Reset the rate limiter
     */
    reset() {
        this.requests = [];
    }
}
// Create a global rate limiter instance
export const globalRateLimiter = new RateLimiter(RATE_LIMIT.MAX_REQUESTS_PER_MINUTE, RATE_LIMIT.WINDOW_MS);
//# sourceMappingURL=rate-limiter.js.map