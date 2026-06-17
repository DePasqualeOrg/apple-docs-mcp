import type { SearchResult } from './search-result-parser.js';
/**
 * Formats search results for display
 */
export declare function formatSearchResults(results: SearchResult[], query: string, filterType: string, searchUrl: string): string;
/**
 * Search Apple Developer Documentation via Apple's search JSON API and return a
 * formatted MCP response.
 */
export declare function fetchAppleDocsSearch(query: string, filterType?: string): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=search-parser.d.ts.map