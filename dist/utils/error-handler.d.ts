/**
 * Unified error handling utilities
 */
import type { AppError, ErrorResponse } from '../types/error.js';
import { ErrorType } from '../types/error.js';
export type { AppError };
export { ErrorType };
/**
 * Extract a human-readable message from an unknown thrown value.
 *
 * Handles the three shapes that reach a catch block here: an `AppError` (a plain
 * object with a string `message`, as returned by `handleFetchError` — note it is
 * NOT an `Error` instance), a real `Error`, and anything else. The naive
 * `error instanceof Error ? error.message : String(error)` renders an `AppError`
 * as the literal `[object Object]`, so prefer this everywhere a fetch/parse error
 * may surface.
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Create a standardized error response
 */
export declare function createErrorResponse(error: AppError): ErrorResponse;
/**
 * Handle fetch errors with specific error types
 */
export declare function handleFetchError(error: unknown, url: string): AppError;
/**
 * Handle JSON parsing errors
 */
export declare function handleParseError(error: unknown): AppError;
/**
 * Validate input parameters
 */
export declare function validateInput(value: string, fieldName: string, minLength?: number): AppError | null;
/**
 * Handle generic errors and convert them to AppError
 */
export declare function handleGenericError(error: unknown, context: string, fallbackMessage?: string): AppError;
/**
 * Create a standardized error response with consistent formatting
 */
export declare function createStandardErrorResponse(error: unknown, operation: string): ErrorResponse;
/**
 * Tool-specific error suggestions
 */
export declare const TOOL_ERROR_SUGGESTIONS: Record<string, Record<string, string[]>>;
/**
 * Get tool-specific error suggestions
 */
export declare function getToolErrorSuggestions(toolName: string, errorType: ErrorType): string[];
/**
 * Create error response with tool-specific suggestions
 */
export declare function createToolErrorResponse(error: AppError, toolName: string): ErrorResponse;
//# sourceMappingURL=error-handler.d.ts.map