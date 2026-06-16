/**
 * Tests for the real error-handler module (the previous test redefined its own
 * ErrorType/validateInput and never imported src, so it tested nothing).
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateInput,
  handleFetchError,
  handleParseError,
  createErrorResponse,
  getErrorMessage,
  ErrorType,
} from '../../src/utils/error-handler.js';

describe('validateInput', () => {
  it('returns an INVALID_INPUT error for empty or blank values', () => {
    const err = validateInput('', 'Query');
    expect(err).not.toBeNull();
    expect(err?.type).toBe(ErrorType.INVALID_INPUT);
    expect(err?.message).toContain('Query');
  });

  it('returns null for valid values', () => {
    expect(validateInput('SwiftUI', 'Query')).toBeNull();
  });

  it('enforces a minimum length', () => {
    expect(validateInput('ab', 'Query', 3)?.type).toBe(ErrorType.INVALID_INPUT);
    expect(validateInput('abc', 'Query', 3)).toBeNull();
  });
});

describe('handleFetchError', () => {
  const url = 'https://developer.apple.com/documentation/swiftui';

  it('maps TypeError to NETWORK_ERROR', () => {
    expect(handleFetchError(new TypeError('fetch failed'), url).type).toBe(ErrorType.NETWORK_ERROR);
  });

  it('maps timeout messages to TIMEOUT', () => {
    expect(handleFetchError(new Error('Request timeout'), url).type).toBe(ErrorType.TIMEOUT);
  });

  it('maps 404 messages to NOT_FOUND and includes the URL in suggestions', () => {
    const err = handleFetchError(new Error('HTTP 404: Not Found'), url);
    expect(err.type).toBe(ErrorType.NOT_FOUND);
    expect(err.suggestions?.some((s) => s.includes(url))).toBe(true);
  });

  it('falls back to UNKNOWN with the original message', () => {
    const err = handleFetchError(new Error('weird failure'), url);
    expect(err.type).toBe(ErrorType.UNKNOWN);
    expect(err.message).toBe('weird failure');
  });
});

describe('getErrorMessage', () => {
  it('extracts the message from an AppError plain object (not "[object Object]")', () => {
    // handleFetchError returns a plain object, NOT an Error instance. The naive
    // `error instanceof Error ? ... : String(error)` rendered this as
    // "[object Object]"; getErrorMessage must return the real message.
    const appError = handleFetchError(new Error('HTTP 404: Not Found'), 'https://developer.apple.com/x');
    expect(appError).not.toBeInstanceOf(Error);
    const message = getErrorMessage(appError);
    expect(message).not.toContain('[object Object]');
    expect(message).toBe(appError.message);
  });

  it('returns the message from a real Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies primitives and null/undefined', () => {
    expect(getErrorMessage('plain string')).toBe('plain string');
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('handles an object whose message is not a string', () => {
    expect(getErrorMessage({ message: 500 })).toBe('500');
  });
});

describe('handleParseError', () => {
  it('returns a PARSE_ERROR', () => {
    expect(handleParseError(new Error('bad json')).type).toBe(ErrorType.PARSE_ERROR);
  });
});

describe('createErrorResponse', () => {
  it('formats an MCP error response with suggestions', () => {
    const res = createErrorResponse({
      type: ErrorType.NOT_FOUND,
      message: 'Nope',
      suggestions: ['Try X'],
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].type).toBe('text');
    expect(res.content[0].text).toContain('Error: Nope');
    expect(res.content[0].text).toContain('• Try X');
  });
});
