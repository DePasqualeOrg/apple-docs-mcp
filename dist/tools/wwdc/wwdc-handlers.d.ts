/**
 * WWDC Video MCP Tool Handlers
 */
import type { GlobalMetadata } from '../../types/wwdc.js';
/**
 * A one-line note that the WWDC data is a bundled, point-in-time snapshot, so
 * answers about recent sessions may be incomplete until the package is updated.
 * Appended once to every WWDC tool's output by the dispatcher (see handlers.ts)
 * so the footer can't drift out of sync across tools.
 */
export declare function wwdcFreshnessNote(metadata: GlobalMetadata): string;
/**
 * List WWDC videos
 */
export declare function handleListWWDCVideos(year?: string, topic?: string, hasCode?: boolean, limit?: number): Promise<string>;
/**
 * Search WWDC content
 */
export declare function handleSearchWWDCContent(query: string, searchIn?: 'transcript' | 'code' | 'both', year?: string, language?: string, limit?: number): Promise<string>;
/**
 * Get WWDC video details
 */
export declare function handleGetWWDCVideo(year: string, videoId: string, includeTranscript?: boolean, includeCode?: boolean): Promise<string>;
/**
 * Get WWDC code examples
 */
export declare function handleGetWWDCCodeExamples(framework?: string, topic?: string, year?: string, language?: string, limit?: number): Promise<string>;
/**
 * Browse WWDC topics
 */
export declare function handleBrowseWWDCTopics(topicId?: string, includeVideos?: boolean, year?: string, limit?: number): Promise<string>;
/**
 * Find related WWDC videos
 */
export declare function handleFindRelatedWWDCVideos(videoId: string, year: string, includeExplicitRelated?: boolean, includeTopicRelated?: boolean, includeYearRelated?: boolean, limit?: number): Promise<string>;
/**
 * List all available WWDC years
 */
export declare function handleListWWDCYears(): Promise<string>;
//# sourceMappingURL=wwdc-handlers.d.ts.map