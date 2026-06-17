/**
 * Tool handlers for Apple Developer Documentation MCP Server
 */
/**
 * The MCP tool response shape every handler returns. Declared as a `type` (not
 * an `interface`) so it keeps an implicit index signature and stays assignable
 * to the MCP SDK's loose `ServerResult` return type at the request-handler call
 * site.
 */
export type ToolResponse = {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
};
/**
 * The subset of the server the tool dispatcher invokes. Declaring it as an
 * interface (rather than `any`) means handler→server calls are type-checked and
 * the server class is verified to implement this contract. Parameters mirror the
 * server's method signatures; defaulted parameters are optional here.
 */
export interface DocsServer {
    searchAppleDocs(query: string, type?: string): Promise<ToolResponse>;
    getAppleDocContent(url: string, includeRelatedApis?: boolean, includeReferences?: boolean, includeSimilarApis?: boolean, includePlatformAnalysis?: boolean): Promise<ToolResponse>;
    listTechnologies(category?: string, language?: string, includeBeta?: boolean, limit?: number): Promise<ToolResponse>;
    searchFrameworkSymbols(framework: string, symbolType?: string, namePattern?: string, language?: string, limit?: number): Promise<ToolResponse>;
    getRelatedApis(apiUrl: string, includeInherited?: boolean, includeConformance?: boolean, includeSeeAlso?: boolean): Promise<ToolResponse>;
    resolveReferencesBatch(sourceUrl: string, maxReferences?: number, filterByType?: string): Promise<ToolResponse>;
    getPlatformCompatibility(apiUrl: string, compareMode?: string, includeRelated?: boolean): Promise<ToolResponse>;
    findSimilarApis(apiUrl: string, searchDepth?: string, filterByCategory?: string, includeAlternatives?: boolean): Promise<ToolResponse>;
    getDocumentationUpdates(category?: string, technology?: string, year?: string, searchQuery?: string, includeBeta?: boolean, limit?: number): Promise<ToolResponse>;
    getTechnologyOverviews(category?: string, searchQuery?: string, includeSubcategories?: boolean, limit?: number): Promise<ToolResponse>;
    getSampleCode(framework?: string, beta?: 'include' | 'exclude' | 'only', searchQuery?: string, limit?: number): Promise<ToolResponse>;
}
/**
 * Tool handler function type
 */
export type ToolHandler = (args: unknown, server: DocsServer) => Promise<ToolResponse>;
/**
 * Map of tool names to their handlers
 */
export declare const toolHandlers: Record<string, ToolHandler>;
/**
 * Handle tool call with the appropriate handler
 */
export declare function handleToolCall(toolName: string, args: unknown, server: DocsServer): Promise<ToolResponse>;
//# sourceMappingURL=handlers.d.ts.map