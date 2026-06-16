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

import { REQUEST_CONFIG, ERROR_MESSAGES } from './constants.js';
import { handleFetchError } from './error-handler.js';
import { globalRateLimiter } from './rate-limiter.js';

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
 * Performance statistics for HTTP client monitoring
 */
interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  successRate: number;
  requestsByStatus: Record<number, number>;
  requestsByDomain: Record<string, number>;
}

/**
 * Error that carries the HTTP status as structured data, so callers never have
 * to recover the status by parsing the message text.
 */
export class HttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Hosts this client is allowed to reach. `developer.apple.com` serves the docs
 * render JSON; `devintserv.msc.sbz.apple.com` backs the developer search API.
 * Enforced as defense in depth against SSRF — callers should still validate
 * untrusted input, but a non-Apple host can never be fetched even if they don't.
 */
const ALLOWED_HOSTS = new Set([
  'developer.apple.com',
  'devintserv.msc.sbz.apple.com',
]);

/**
 * A single realistic Safari User-Agent plus a fixed, coherent header set. A
 * plausible User-Agent avoids the dumbest WAF rejections; consistency matters
 * more than variety against fingerprinting-based defenses.
 */
const BASE_HEADERS: Record<string, string> = {
  'User-Agent': REQUEST_CONFIG.DEFAULT_SAFARI_USER_AGENT,
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
};

/**
 * Parse a Retry-After header value (delta-seconds or an HTTP date) into ms.
 */
function parseRetryAfter(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const when = Date.parse(value);
  if (!Number.isNaN(when)) {
    return Math.max(0, when - Date.now());
  }
  return undefined;
}

class HttpClient {
  // Counting semaphore: `permits` available, plus a queue of waiters. release()
  // hands a permit directly to the next waiter rather than incrementing then
  // racing, so concurrency never exceeds the cap.
  private permits = REQUEST_CONFIG.MAX_CONCURRENT_REQUESTS;
  private readonly waiters: Array<() => void> = [];

  private stats: PerformanceStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    successRate: 0,
    requestsByStatus: {},
    requestsByDomain: {},
  };

  private async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    this.permits++;
  }

  private assertAllowedHost(url: string): void {
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
    if (!ALLOWED_HOSTS.has(host)) {
      throw new Error(`Refusing to fetch non-Apple host: ${host}`);
    }
  }

  /**
   * Core request path: SSRF guard, concurrency limiting, rate limiting, and
   * retry with backoff. All public methods funnel through here.
   */
  private async request(
    url: string,
    init: { method: string; headers?: Record<string, string>; body?: string },
    options: RequestOptions = {},
  ): Promise<Response> {
    this.assertAllowedHost(url);

    const {
      timeout = REQUEST_CONFIG.TIMEOUT,
      retries = REQUEST_CONFIG.MAX_RETRIES,
      retryDelay = REQUEST_CONFIG.RETRY_DELAY,
    } = options;

    // Pace requests before taking a concurrency permit, so a rate-limited
    // request waits without occupying a slot. The limiter applies backpressure
    // instead of throwing; the concurrency semaphore then caps in-flight work.
    await globalRateLimiter.acquire();

    await this.acquire();
    try {
      const headers = { ...BASE_HEADERS, ...init.headers, ...options.headers };
      return await this.fetchWithRetry(
        url,
        { method: init.method, headers, body: init.body },
        { timeout, retries, retryDelay },
      );
    } finally {
      this.release();
    }
  }

  /**
   * Fetch with retry, performance monitoring, and 429/Retry-After handling.
   * The timeout signal is created per attempt so a queued request never burns
   * its whole budget waiting for a slot.
   */
  private async fetchWithRetry(
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string },
    cfg: { timeout: number; retries: number; retryDelay: number },
  ): Promise<Response> {
    const { timeout, retries, retryDelay } = cfg;
    const domain = new URL(url).hostname;
    this.stats.requestsByDomain[domain] = (this.stats.requestsByDomain[domain] || 0) + 1;
    this.stats.totalRequests++;

    const startTime = Date.now();
    const backoff = (attempt: number): number => retryDelay * 2 ** attempt;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: init.method,
          headers: init.headers,
          body: init.body,
          signal: AbortSignal.timeout(timeout),
        });
      } catch (error) {
        const name = (error as Error)?.name;
        lastError =
          name === 'TimeoutError' || name === 'AbortError'
            ? new Error(ERROR_MESSAGES.TIMEOUT)
            : error instanceof Error
              ? error
              : new Error(String(error));
        if (attempt < retries) {
          await this.delay(backoff(attempt));
          continue;
        }
        break;
      }

      this.stats.requestsByStatus[response.status] =
        (this.stats.requestsByStatus[response.status] || 0) + 1;

      if (response.ok) {
        this.finalize(true, Date.now() - startTime);
        return response;
      }

      // 404 is terminal — the document does not exist.
      if (response.status === 404) {
        this.finalize(false, Date.now() - startTime);
        throw new HttpError(`${ERROR_MESSAGES.NOT_FOUND} (404)`, response.status);
      }

      lastError = new HttpError(`HTTP ${response.status}: ${response.statusText}`, response.status);

      // Retry 429 (honoring Retry-After) and 5xx; everything else is terminal.
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < retries) {
        const wait =
          response.status === 429
            ? parseRetryAfter(response.headers.get('retry-after')) ?? backoff(attempt)
            : backoff(attempt);
        await this.delay(wait);
        continue;
      }

      this.finalize(false, Date.now() - startTime);
      throw lastError;
    }

    this.finalize(false, Date.now() - startTime);
    throw lastError ?? new Error('Request failed after retries');
  }

  private finalize(success: boolean, responseTime: number): void {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    this.stats.totalResponseTime += responseTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalRequests;
    this.stats.successRate = (this.stats.successfulRequests / this.stats.totalRequests) * 100;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET returning the raw Response.
   */
  async get(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.request(url, { method: 'GET', headers: { Accept: 'application/json' } }, options);
  }

  /**
   * GET returning parsed JSON.
   */
  async getJson<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
    try {
      const response = await this.request(
        url,
        { method: 'GET', headers: { Accept: 'application/json' } },
        options,
      );
      return (await response.json()) as T;
    } catch (error) {
      throw handleFetchError(error, url);
    }
  }

  /**
   * GET returning the response body as text.
   */
  async getText(url: string, options: RequestOptions = {}): Promise<string> {
    try {
      const response = await this.request(
        url,
        {
          method: 'GET',
          headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        },
        options,
      );
      return await response.text();
    } catch (error) {
      throw handleFetchError(error, url);
    }
  }

  /**
   * POST a JSON body and return parsed JSON. Used by the search tool, which
   * posts to Apple's search API.
   */
  async postJson<T = unknown>(url: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    try {
      const response = await this.request(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        },
        options,
      );
      return (await response.json()) as T;
    } catch (error) {
      throw handleFetchError(error, url);
    }
  }

  /**
   * Reset performance statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      successRate: 0,
      requestsByStatus: {},
      requestsByDomain: {},
    };
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
