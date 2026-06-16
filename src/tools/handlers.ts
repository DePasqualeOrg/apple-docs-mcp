/**
 * Tool handlers for Apple Developer Documentation MCP Server
 */

import {
  searchAppleDocsSchema,
  getAppleDocContentSchema,
  listTechnologiesSchema,
  searchFrameworkSymbolsSchema,
  getRelatedApisSchema,
  resolveReferencesBatchSchema,
  getPlatformCompatibilitySchema,
  findSimilarApisSchema,
  getDocumentationUpdatesSchema,
  getTechnologyOverviewsSchema,
  getSampleCodeSchema,
} from '../schemas/index.js';
import {
  listWWDCVideosSchema,
  searchWWDCContentSchema,
  getWWDCVideoSchema,
  getWWDCCodeExamplesSchema,
  browseWWDCTopicsSchema,
  findRelatedWWDCVideosSchema,
} from '../schemas/wwdc.schemas.js';
import {
  handleListWWDCVideos,
  handleSearchWWDCContent,
  handleGetWWDCVideo,
  handleGetWWDCCodeExamples,
  handleBrowseWWDCTopics,
  handleFindRelatedWWDCVideos,
  handleListWWDCYears,
  wwdcFreshnessNote,
} from './wwdc/wwdc-handlers.js';
import { loadGlobalMetadata } from '../utils/wwdc-data-source.js';
import { getErrorMessage } from '../utils/error-handler.js';

/**
 * Wrap a WWDC handler's text output in an MCP response, appending the data
 * freshness footer once. Centralizing this here keeps the footer consistent
 * across all WWDC tools. Error strings and metadata-load failures are returned
 * unchanged so the footer never masks or duplicates an error.
 */
async function wwdcToolResult(
  text: string,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (text.startsWith('Error:')) {
    return { content: [{ type: 'text', text }] };
  }
  try {
    const metadata = await loadGlobalMetadata();
    // trimEnd so a body already ending in a blank line doesn't stack up to a
    // triple blank line before the footer.
    return { content: [{ type: 'text', text: `${text.trimEnd()}\n\n${wwdcFreshnessNote(metadata)}` }] };
  } catch {
    return { content: [{ type: 'text', text }] };
  }
}

/**
 * The MCP tool response shape every handler returns. Declared as a `type` (not
 * an `interface`) so it keeps an implicit index signature and stays assignable
 * to the MCP SDK's loose `ServerResult` return type at the request-handler call
 * site.
 */
export type ToolResponse = {
  content: Array<{ type: string; text: string }>;
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
  getAppleDocContent(
    url: string,
    includeRelatedApis?: boolean,
    includeReferences?: boolean,
    includeSimilarApis?: boolean,
    includePlatformAnalysis?: boolean,
  ): Promise<ToolResponse>;
  listTechnologies(
    category?: string,
    language?: string,
    includeBeta?: boolean,
    limit?: number,
  ): Promise<ToolResponse>;
  searchFrameworkSymbols(
    framework: string,
    symbolType?: string,
    namePattern?: string,
    language?: string,
    limit?: number,
  ): Promise<ToolResponse>;
  getRelatedApis(
    apiUrl: string,
    includeInherited?: boolean,
    includeConformance?: boolean,
    includeSeeAlso?: boolean,
  ): Promise<ToolResponse>;
  resolveReferencesBatch(
    sourceUrl: string,
    maxReferences?: number,
    filterByType?: string,
  ): Promise<ToolResponse>;
  getPlatformCompatibility(
    apiUrl: string,
    compareMode?: string,
    includeRelated?: boolean,
  ): Promise<ToolResponse>;
  findSimilarApis(
    apiUrl: string,
    searchDepth?: string,
    filterByCategory?: string,
    includeAlternatives?: boolean,
  ): Promise<ToolResponse>;
  getDocumentationUpdates(
    category?: string,
    technology?: string,
    year?: string,
    searchQuery?: string,
    includeBeta?: boolean,
    limit?: number,
  ): Promise<ToolResponse>;
  getTechnologyOverviews(
    category?: string,
    searchQuery?: string,
    includeSubcategories?: boolean,
    limit?: number,
  ): Promise<ToolResponse>;
  getSampleCode(
    framework?: string,
    beta?: 'include' | 'exclude' | 'only',
    searchQuery?: string,
    limit?: number,
  ): Promise<ToolResponse>;
}

/**
 * Tool handler function type
 */
export type ToolHandler = (
  args: unknown,
  server: DocsServer
) => Promise<ToolResponse>;

/**
 * Map of tool names to their handlers
 */
export const toolHandlers: Record<string, ToolHandler> = {
  search_apple_docs: async (args, server) => {
    const validatedArgs = searchAppleDocsSchema.parse(args);
    return await server.searchAppleDocs(validatedArgs.query, validatedArgs.type);
  },

  get_apple_doc_content: async (args, server) => {
    const validatedArgs = getAppleDocContentSchema.parse(args);
    return await server.getAppleDocContent(
      validatedArgs.url,
      validatedArgs.includeRelatedApis,
      validatedArgs.includeReferences,
      validatedArgs.includeSimilarApis,
      validatedArgs.includePlatformAnalysis,
    );
  },

  list_technologies: async (args, server) => {
    const validatedArgs = listTechnologiesSchema.parse(args);
    return await server.listTechnologies(
      validatedArgs.category,
      validatedArgs.language,
      validatedArgs.includeBeta,
      validatedArgs.limit,
    );
  },

  search_framework_symbols: async (args, server) => {
    const validatedArgs = searchFrameworkSymbolsSchema.parse(args);
    return await server.searchFrameworkSymbols(
      validatedArgs.framework,
      validatedArgs.symbolType,
      validatedArgs.namePattern,
      validatedArgs.language,
      validatedArgs.limit,
    );
  },

  get_related_apis: async (args, server) => {
    const validatedArgs = getRelatedApisSchema.parse(args);
    return await server.getRelatedApis(
      validatedArgs.apiUrl,
      validatedArgs.includeInherited,
      validatedArgs.includeConformance,
      validatedArgs.includeSeeAlso,
    );
  },

  resolve_references_batch: async (args, server) => {
    const validatedArgs = resolveReferencesBatchSchema.parse(args);
    return await server.resolveReferencesBatch(
      validatedArgs.sourceUrl,
      validatedArgs.maxReferences,
      validatedArgs.filterByType,
    );
  },

  get_platform_compatibility: async (args, server) => {
    const validatedArgs = getPlatformCompatibilitySchema.parse(args);
    return await server.getPlatformCompatibility(
      validatedArgs.apiUrl,
      validatedArgs.compareMode,
      validatedArgs.includeRelated,
    );
  },

  find_similar_apis: async (args, server) => {
    const validatedArgs = findSimilarApisSchema.parse(args);
    return await server.findSimilarApis(
      validatedArgs.apiUrl,
      validatedArgs.searchDepth,
      validatedArgs.filterByCategory,
      validatedArgs.includeAlternatives,
    );
  },

  get_documentation_updates: async (args, server) => {
    const validatedArgs = getDocumentationUpdatesSchema.parse(args);
    return await server.getDocumentationUpdates(
      validatedArgs.category,
      validatedArgs.technology,
      validatedArgs.year,
      validatedArgs.searchQuery,
      validatedArgs.includeBeta,
      validatedArgs.limit,
    );
  },

  get_technology_overviews: async (args, server) => {
    const validatedArgs = getTechnologyOverviewsSchema.parse(args);
    return await server.getTechnologyOverviews(
      validatedArgs.category,
      validatedArgs.searchQuery,
      validatedArgs.includeSubcategories,
      validatedArgs.limit,
    );
  },

  get_sample_code: async (args, server) => {
    const validatedArgs = getSampleCodeSchema.parse(args);
    return await server.getSampleCode(
      validatedArgs.framework,
      validatedArgs.beta,
      validatedArgs.searchQuery,
      validatedArgs.limit,
    );
  },

  // WWDC tools
  list_wwdc_videos: async (args, _server) => {
    const validatedArgs = listWWDCVideosSchema.parse(args);
    const result = await handleListWWDCVideos(
      validatedArgs.year,
      validatedArgs.topic,
      validatedArgs.hasCode,
      validatedArgs.limit,
    );
    return wwdcToolResult(result);
  },

  search_wwdc_content: async (args, _server) => {
    const validatedArgs = searchWWDCContentSchema.parse(args);
    const result = await handleSearchWWDCContent(
      validatedArgs.query,
      validatedArgs.searchIn,
      validatedArgs.year,
      validatedArgs.language,
      validatedArgs.limit,
    );
    return wwdcToolResult(result);
  },

  get_wwdc_video: async (args, _server) => {
    const validatedArgs = getWWDCVideoSchema.parse(args);
    const result = await handleGetWWDCVideo(
      validatedArgs.year,
      validatedArgs.videoId,
      validatedArgs.includeTranscript,
      validatedArgs.includeCode,
    );
    return wwdcToolResult(result);
  },

  get_wwdc_code_examples: async (args, _server) => {
    const validatedArgs = getWWDCCodeExamplesSchema.parse(args);
    const result = await handleGetWWDCCodeExamples(
      validatedArgs.framework,
      validatedArgs.topic,
      validatedArgs.year,
      validatedArgs.language,
      validatedArgs.limit,
    );
    return wwdcToolResult(result);
  },

  browse_wwdc_topics: async (args, _server) => {
    const validatedArgs = browseWWDCTopicsSchema.parse(args);
    const result = await handleBrowseWWDCTopics(
      validatedArgs.topicId,
      validatedArgs.includeVideos,
      validatedArgs.year,
      validatedArgs.limit,
    );
    return wwdcToolResult(result);
  },

  find_related_wwdc_videos: async (args, _server) => {
    const validatedArgs = findRelatedWWDCVideosSchema.parse(args);
    const result = await handleFindRelatedWWDCVideos(
      validatedArgs.videoId,
      validatedArgs.year,
      validatedArgs.includeExplicitRelated,
      validatedArgs.includeTopicRelated,
      validatedArgs.includeYearRelated,
      validatedArgs.limit,
    );
    return wwdcToolResult(result);
  },

  list_wwdc_years: async (_args, _server) => {
    const result = await handleListWWDCYears();
    return wwdcToolResult(result);
  },
};

/**
 * Handle tool call with the appropriate handler
 */
export async function handleToolCall(
  toolName: string,
  args: unknown,
  server: DocsServer,
): Promise<ToolResponse> {
  try {
    const handler = toolHandlers[toolName];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await handler(args, server);
  } catch (error) {
    // Return error response for validation errors and unknown tools
    return {
      content: [{
        type: 'text',
        text: `Error: ${getErrorMessage(error)}`,
      }],
      isError: true,
    };
  }
}