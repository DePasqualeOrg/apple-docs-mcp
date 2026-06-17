#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { fetchAppleDocsSearch } from './tools/search-parser.js';
import { fetchAppleDocJson } from './tools/doc-fetcher.js';
import { handleListTechnologies } from './tools/list-technologies.js';
import { searchFrameworkSymbols } from './tools/search-framework-symbols.js';
import { toolDefinitions } from './tools/definitions.js';
import { handleToolCall } from './tools/handlers.js';
import { handleGetRelatedApis } from './tools/get-related-apis.js';
import { handleResolveReferencesBatch } from './tools/resolve-references-batch.js';
import { handleGetPlatformCompatibility } from './tools/get-platform-compatibility.js';
import { handleFindSimilarApis } from './tools/find-similar-apis.js';
import { handleGetDocumentationUpdates } from './tools/get-documentation-updates.js';
import { handleGetTechnologyOverviews } from './tools/get-technology-overviews.js';
import { handleGetSampleCode } from './tools/get-sample-code.js';
import { isValidAppleDeveloperUrl } from './utils/url-converter.js';
import { validateInput, ErrorType, createStandardErrorResponse, createToolErrorResponse } from './utils/error-handler.js';
import { preloadPopularFrameworks } from './utils/preloader.js';
import { warmUpCaches, schedulePeriodicCacheRefresh } from './utils/cache-warmer.js';
import { logger } from './utils/logger.js';
import { API_LIMITS } from './utils/constants.js';
export default class AppleDeveloperDocsMCPServer {
    server;
    /**
     * Helper method to handle async operations with consistent error handling
     */
    async handleAsyncOperation(operation, operationName) {
        try {
            const result = await operation();
            return {
                content: [
                    {
                        type: 'text',
                        text: result,
                    },
                ],
            };
        }
        catch (error) {
            // If error is already an AppError, use tool-specific suggestions
            if (error && typeof error === 'object' && 'type' in error) {
                return createToolErrorResponse(error, operationName);
            }
            return createStandardErrorResponse(error, operationName);
        }
    }
    constructor() {
        this.server = new Server({
            name: 'apple-docs-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupTools();
        this.setupErrorHandling();
    }
    setupTools() {
        // const cacheStatsSchema = z.object({});
        // Handle list-tools requests
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: toolDefinitions,
            };
        });
        // Handle tool-call requests
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                return await handleToolCall(name, args, this);
            }
            catch (error) {
                const appError = error instanceof Error
                    ? { type: 'UNKNOWN', message: error.message, originalError: error }
                    : { type: 'UNKNOWN', message: 'An unknown error occurred' };
                logger.error(`Tool ${name} failed:`, appError);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${appError.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async searchAppleDocs(query, type = 'all') {
        try {
            // Input validation
            const queryValidation = validateInput(query, 'Search query');
            if (queryValidation) {
                return createToolErrorResponse(queryValidation, 'search_apple_docs');
            }
            logger.info(`Searching Apple docs for: ${query}`);
            // Query Apple's search JSON API and return formatted results.
            return await fetchAppleDocsSearch(query, type);
        }
        catch (error) {
            if (error && typeof error === 'object' && 'type' in error) {
                return createToolErrorResponse(error, 'search_apple_docs');
            }
            return createStandardErrorResponse(error, 'search_apple_docs');
        }
    }
    async getAppleDocContent(url, includeRelatedApis = false, includeReferences = false, includeSimilarApis = false, includePlatformAnalysis = false) {
        try {
            // Input validation
            const urlValidation = validateInput(url, 'URL');
            if (urlValidation) {
                return createToolErrorResponse(urlValidation, 'get_apple_doc_content');
            }
            // Validate that this is a real Apple Developer URL
            if (!isValidAppleDeveloperUrl(url)) {
                return createToolErrorResponse({
                    type: ErrorType.INVALID_INPUT,
                    message: 'URL must be from developer.apple.com',
                }, 'get_apple_doc_content');
            }
            // fetchAppleDocJson already returns the correct MCP response format, so return it directly
            return await fetchAppleDocJson(url, {
                includeRelatedApis,
                includeReferences,
                includeSimilarApis,
                includePlatformAnalysis,
            });
        }
        catch (error) {
            if (error && typeof error === 'object' && 'type' in error) {
                return createToolErrorResponse(error, 'get_apple_doc_content');
            }
            return createStandardErrorResponse(error, 'get_apple_doc_content');
        }
    }
    async listTechnologies(category, language, includeBeta = true, limit = API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT) {
        return this.handleAsyncOperation(() => handleListTechnologies(category, language, includeBeta, limit), 'listTechnologies');
    }
    async searchFrameworkSymbols(framework, symbolType = 'all', namePattern, language = 'swift', limit = API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT) {
        return this.handleAsyncOperation(() => searchFrameworkSymbols(framework, symbolType, namePattern, language, limit), 'searchFrameworkSymbols');
    }
    async getRelatedApis(apiUrl, includeInherited = true, includeConformance = true, includeSeeAlso = true) {
        return this.handleAsyncOperation(() => handleGetRelatedApis(apiUrl, includeInherited, includeConformance, includeSeeAlso), 'getRelatedApis');
    }
    async resolveReferencesBatch(sourceUrl, maxReferences = API_LIMITS.DEFAULT_REFERENCES_LIMIT, filterByType = 'all') {
        return this.handleAsyncOperation(() => handleResolveReferencesBatch(sourceUrl, maxReferences, filterByType), 'resolveReferencesBatch');
    }
    async getPlatformCompatibility(apiUrl, compareMode = 'single', includeRelated = false) {
        return this.handleAsyncOperation(() => handleGetPlatformCompatibility(apiUrl, compareMode, includeRelated), 'getPlatformCompatibility');
    }
    async findSimilarApis(apiUrl, searchDepth = 'medium', filterByCategory, includeAlternatives = true) {
        return this.handleAsyncOperation(() => handleFindSimilarApis(apiUrl, searchDepth, filterByCategory, includeAlternatives), 'findSimilarApis');
    }
    async getDocumentationUpdates(category = 'all', technology, year, searchQuery, includeBeta = true, limit = API_LIMITS.DEFAULT_DOCUMENTATION_UPDATES_LIMIT) {
        return this.handleAsyncOperation(() => handleGetDocumentationUpdates(category, technology, year, searchQuery, includeBeta, limit), 'getDocumentationUpdates');
    }
    async getTechnologyOverviews(category, searchQuery, includeSubcategories = true, limit = API_LIMITS.DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT) {
        return this.handleAsyncOperation(() => handleGetTechnologyOverviews(category, searchQuery, includeSubcategories, limit), 'getTechnologyOverviews');
    }
    async getSampleCode(framework, beta = 'include', searchQuery, limit = API_LIMITS.DEFAULT_SAMPLE_CODE_LIMIT) {
        return this.handleAsyncOperation(() => handleGetSampleCode(framework, beta, searchQuery, limit), 'getSampleCode');
    }
    setupErrorHandling() {
        // Handle SIGINT to shut down the server gracefully
        process.on('SIGINT', () => {
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            process.exit(0);
        });
        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled Rejection, reason:', reason);
            process.exit(1);
        });
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.info('Apple Developer Docs MCP server running on stdio');
        logger.info('WWDC Data: Using bundled data from npm package');
        logger.info('Cache system initialized with TTL: API(30m), Index(1h), Technologies(2h)');
        logger.info('Note: Search results are not cached to ensure real-time accuracy');
        // Optional background preloading + cache warming. Off by default: this is a
        // per-session stdio server (often launched via npx), so issuing ~15
        // speculative requests on every launch before the user asks for anything is
        // wasteful. Opt in with APPLE_DOCS_PRELOAD=true for long-lived deployments.
        if (process.env.APPLE_DOCS_PRELOAD === 'true') {
            Promise.all([
                preloadPopularFrameworks(),
                warmUpCaches(),
            ]).catch(error => {
                logger.error('Background initialization failed:', error);
            });
            // Schedule periodic cache refresh (every 30 minutes)
            schedulePeriodicCacheRefresh();
        }
    }
}
// Run server (only in non-test environment)
if (process.env.NODE_ENV !== 'test') {
    const server = new AppleDeveloperDocsMCPServer();
    void server.run().catch((error) => {
        logger.error('Fatal error in main():', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map