/**
 * URL conversion utilities for Apple Developer Documentation
 */
/**
 * Convert a web URL to a JSON API URL
 * @param webUrl The web URL to convert
 * @returns The corresponding JSON API URL
 */
export declare function convertToJsonApiUrl(webUrl: string): string | null;
/**
 * Build an absolute developer.apple.com URL from a reference's `url` field.
 *
 * Apple's `references` map normally stores site-relative paths (e.g.
 * `/documentation/swiftui/view`), so the common case is to prepend the host.
 * An already-absolute URL is returned unchanged, which prevents producing a
 * malformed `https://developer.apple.com/https://…` if Apple ever emits one.
 * Missing or empty input yields `fallback` (default `'#'`).
 *
 * @param url The reference URL (relative path or absolute), if present
 * @param fallback Value to return when `url` is missing/empty
 */
export declare function toAbsoluteAppleUrl(url: string | null | undefined, fallback?: string): string;
/**
 * Validate if URL is from Apple Developer domain
 * @param url The URL to validate
 * @returns True if valid Apple Developer URL
 */
export declare function isValidAppleDeveloperUrl(url: string): boolean;
/**
 * Extract API name from URL
 * @param url The URL to extract name from
 * @returns The API name
 */
export declare function extractApiNameFromUrl(url: string): string;
//# sourceMappingURL=url-converter.d.ts.map