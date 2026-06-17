#!/usr/bin/env node
export default class AppleDeveloperDocsMCPServer {
    private server;
    /**
     * Helper method to handle async operations with consistent error handling
     */
    private handleAsyncOperation;
    constructor();
    private setupTools;
    searchAppleDocs(query: string, type?: string): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    getAppleDocContent(url: string, includeRelatedApis?: boolean, includeReferences?: boolean, includeSimilarApis?: boolean, includePlatformAnalysis?: boolean): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
        isError?: boolean;
    }>;
    listTechnologies(category?: string, language?: string, includeBeta?: boolean, limit?: number): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    searchFrameworkSymbols(framework: string, symbolType?: string, namePattern?: string, language?: string, limit?: number): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    getRelatedApis(apiUrl: string, includeInherited?: boolean, includeConformance?: boolean, includeSeeAlso?: boolean): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    resolveReferencesBatch(sourceUrl: string, maxReferences?: number, filterByType?: string): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    getPlatformCompatibility(apiUrl: string, compareMode?: string, includeRelated?: boolean): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    findSimilarApis(apiUrl: string, searchDepth?: string, filterByCategory?: string, includeAlternatives?: boolean): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    getDocumentationUpdates(category?: string, technology?: string, year?: string, searchQuery?: string, includeBeta?: boolean, limit?: number): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    getTechnologyOverviews(category?: string, searchQuery?: string, includeSubcategories?: boolean, limit?: number): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    getSampleCode(framework?: string, beta?: 'include' | 'exclude' | 'only', searchQuery?: string, limit?: number): Promise<{
        content: Array<{
            type: "text";
            text: string;
        }>;
        isError?: boolean;
    }>;
    private setupErrorHandling;
    run(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map