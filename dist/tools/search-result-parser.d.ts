/**
 * Search result types and mapping from Apple's developer search API.
 *
 * Apple's search page (developer.apple.com/search) is client-rendered and calls
 * a JSON API; this maps that API's response into the flat SearchResult shape the
 * formatter consumes. Only `documentation` entries are surfaced — the API also
 * returns a `developer` category (videos, news, sessions) in a parallel-array
 * shape that this documentation tool does not present.
 */
export interface SearchResult {
    title: string;
    url: string;
    type: string;
    description: string;
    framework?: string;
    beta?: boolean;
}
interface DocumentationMetadata {
    title?: string;
    description?: string;
    hierarchy?: string;
    availability?: string;
    kind?: string;
    permalink?: string;
}
interface SearchResultEntry {
    documentation?: {
        metadata?: DocumentationMetadata;
    };
}
export interface AppleSearchResponse {
    results?: SearchResultEntry[];
    featuredResults?: SearchResultEntry[];
}
/**
 * Type filter mapping for the tool's `type` argument. The JSON API returns
 * documentation pages (symbols and articles) and sample code; `all` surfaces
 * both, `documentation` restricts to reference pages, and `sample` to samples.
 */
export declare const typeMapping: Record<string, string[]>;
/**
 * Map the search API response into SearchResult[], applying the type filter and
 * de-duplicating by URL. Featured results are listed first.
 */
export declare function mapSearchResults(data: AppleSearchResponse, filterType?: string): SearchResult[];
export {};
//# sourceMappingURL=search-result-parser.d.ts.map