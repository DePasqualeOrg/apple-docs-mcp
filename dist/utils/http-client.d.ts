/**
 * HTTP client for fetching Apple Developer Documentation.
 *
 * Apple's developer endpoints sit behind a CDN/WAF that rate-limits and can
 * block obviously-automated traffic. The mitigations that actually work are a
 * single realistic User-Agent, request pacing (a concurrency cap plus a rate
 * limiter), and honoring 429/Retry-After. Rotating many User-Agents does not
 * help — Apple fingerprints the TLS handshake and limits by IP, neither of which
 * a User-Agent string changes — so that machinery was removed.
 *
 * Features:
 * - Single realistic Safari User-Agent with a fixed, coherent header set
 * - Concurrency limiting via a counting semaphore
 * - Retry with exponential backoff for 5xx/network errors
 * - 429 handling that respects the Retry-After header
 * - Per-attempt request timeout
 * - SSRF guard: only Apple hosts may be fetched
 * - Performance statistics collection
 */
/**
 * Configuration options for HTTP requests
 */
interface RequestOptions {
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Maximum number of retry attempts */
    retries?: number;
    /** Delay between retries in milliseconds */
    retryDelay?: number;
    /** Additional headers to include in the request */
    headers?: Record<string, string>;
}
/**
 * Error that carries the HTTP status as structured data, so callers never have
 * to recover the status by parsing the message text.
 */
export declare class HttpError extends Error {
    readonly status?: number | undefined;
    constructor(message: string, status?: number | undefined);
}
declare class HttpClient {
    private permits;
    private readonly waiters;
    private stats;
    private acquire;
    private release;
    private assertAllowedHost;
    /**
     * Core request path: SSRF guard, concurrency limiting, rate limiting, and
     * retry with backoff. All public methods funnel through here.
     */
    private request;
    /**
     * Fetch with retry, performance monitoring, and 429/Retry-After handling.
     * The timeout signal is created per attempt so a queued request never burns
     * its whole budget waiting for a slot.
     */
    private fetchWithRetry;
    private finalize;
    private delay;
    /**
     * GET returning the raw Response.
     */
    get(url: string, options?: RequestOptions): Promise<Response>;
    /**
     * GET returning parsed JSON.
     */
    getJson<T = unknown>(url: string, options?: RequestOptions): Promise<T>;
    /**
     * GET returning the response body as text.
     */
    getText(url: string, options?: RequestOptions): Promise<string>;
    /**
     * POST a JSON body and return parsed JSON. Used by the search tool, which
     * posts to Apple's search API.
     */
    postJson<T = unknown>(url: string, body: unknown, options?: RequestOptions): Promise<T>;
    /**
     * Reset performance statistics
     */
    resetStats(): void;
}
export declare const httpClient: HttpClient;
export {};
//# sourceMappingURL=http-client.d.ts.map