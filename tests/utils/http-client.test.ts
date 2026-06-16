/**
 * Hermetic tests for the HTTP client.
 *
 * These exercise the real `httpClient` with a mocked `fetch`, covering the
 * behaviors that matter: the SSRF host allowlist, concurrency limiting, retry
 * with backoff for 5xx, 429 + Retry-After handling, 404 as terminal, structured
 * HttpError status, and timeout mapping. No real network access.
 */

import { jest } from '@jest/globals';
import { httpClient, HttpError } from '../../src/utils/http-client.js';

const ALLOWED_URL = 'https://developer.apple.com/tutorials/data/documentation/swiftui.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const realFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  httpClient.resetStats();
});

afterEach(() => {
  (global as unknown as { fetch: unknown }).fetch = realFetch;
});

describe('httpClient SSRF guard', () => {
  it('refuses a non-Apple host and never calls fetch', async () => {
    await expect(
      httpClient.get('https://evil.example/developer.apple.com/x.json'),
    ).rejects.toThrow(/non-Apple host/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows the search API host', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    await expect(
      httpClient.postJson('https://devintserv.msc.sbz.apple.com/api/v1/search', { text: 'x' }),
    ).resolves.toEqual({ results: [] });
  });
});

describe('httpClient success + JSON', () => {
  it('returns parsed JSON on 200', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await expect(httpClient.getJson(ALLOWED_URL)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a single static Safari User-Agent', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await httpClient.getJson(ALLOWED_URL);
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/Safari/);
  });
});

describe('httpClient retry behavior', () => {
  it('does not retry a 404 and throws a structured HttpError', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(httpClient.get(ALLOWED_URL, { retries: 3 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 5xx then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(httpClient.getJson(ALLOWED_URL, { retries: 1, retryDelay: 1 })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a 429 honoring Retry-After, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(httpClient.getJson(ALLOWED_URL, { retries: 1, retryDelay: 1 })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('carries the HTTP status on the error', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    expect.assertions(2);
    try {
      await httpClient.get(ALLOWED_URL, { retries: 0 });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(503);
    }
  });

  it('maps a timeout to a clear message', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));
    await expect(httpClient.get(ALLOWED_URL, { retries: 0 })).rejects.toThrow(/timed out/i);
  });
});

describe('httpClient concurrency limiting', () => {
  it('never exceeds the configured concurrency cap', async () => {
    let inFlight = 0;
    let peak = 0;
    fetchMock.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return jsonResponse({});
    });

    await Promise.all(Array.from({ length: 12 }, () => httpClient.getJson(ALLOWED_URL)));

    // REQUEST_CONFIG.MAX_CONCURRENT_REQUESTS is 5.
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });
});
