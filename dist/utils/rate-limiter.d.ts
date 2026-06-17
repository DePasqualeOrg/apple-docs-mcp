/**
 * Rate limiter for API requests
 */
export declare class RateLimiter {
    private requests;
    private readonly maxRequests;
    private readonly windowMs;
    constructor(maxRequests?: 100, windowMs?: 60000);
    /**
     * Reserve a request slot, waiting if the window is currently full.
     *
     * This applies backpressure (the caller awaits) rather than throwing, so a
     * burst is paced instead of failing. With the HTTP client's small concurrency
     * cap the limiter rarely trips; when it does, callers wait until the oldest
     * in-window request ages out.
     */
    acquire(): Promise<void>;
    /**
     * Get current usage statistics
     */
    getStats(): {
        currentRequests: number;
        maxRequests: number;
        windowMs: number;
        utilizationRate: string;
    };
    /**
     * Reset the rate limiter
     */
    reset(): void;
}
export declare const globalRateLimiter: RateLimiter;
//# sourceMappingURL=rate-limiter.d.ts.map