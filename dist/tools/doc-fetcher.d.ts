import type { AppleDocJSON } from '../types/apple-docs.js';
/**
 * Format JSON documentation content with enhanced analysis
 */
export declare function formatJsonDocumentation(jsonData: AppleDocJSON, originalUrl: string, options?: EnhancedAnalysisOptions): {
    content: Array<{
        type: string;
        text: string;
    }>;
};
/**
 * Enhanced analysis options
 */
interface EnhancedAnalysisOptions {
    includeRelatedApis?: boolean;
    includeReferences?: boolean;
    includeSimilarApis?: boolean;
    includePlatformAnalysis?: boolean;
}
/**
 * The MCP response shape this fetcher produces (and caches).
 */
type DocFetchResult = {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
};
/**
 * Fetch JSON documentation from Apple Developer Documentation with optional enhanced analysis
 * @param url The URL of the documentation page
 * @param options Enhanced analysis options
 * @param maxDepth Maximum recursion depth (to prevent infinite loops)
 * @returns Formatted documentation content
 */
export declare function fetchAppleDocJson(url: string, options?: EnhancedAnalysisOptions, maxDepth?: number): Promise<DocFetchResult>;
export {};
//# sourceMappingURL=doc-fetcher.d.ts.map