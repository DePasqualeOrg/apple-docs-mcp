/**
 * Document formatting utilities
 */
import type { AppleDocJSON } from '../types/apple-docs.js';
/**
 * Format document header with title and status
 */
export declare function formatDocumentHeader(jsonData: AppleDocJSON): string;
/**
 * Format document abstract
 */
export declare function formatDocumentAbstract(jsonData: AppleDocJSON): string;
/**
 * Format platform availability section
 */
export declare function formatPlatformAvailability(jsonData: AppleDocJSON): string;
/**
 * Format See Also section
 */
export declare function formatSeeAlsoSection(jsonData: AppleDocJSON): string;
/**
 * Check if document is a specific API
 */
export declare function isSpecificAPIDocument(jsonData: AppleDocJSON): boolean;
//# sourceMappingURL=doc-formatter.d.ts.map