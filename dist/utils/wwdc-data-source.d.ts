/**
 * WWDC Data Source - Loads data from bundled JSON files
 *
 * This module provides functions to load WWDC video data from
 * JSON files that are bundled with the npm package.
 */
import type { WWDCVideo, GlobalMetadata, TopicIndex, YearIndex } from '../types/wwdc.js';
/**
 * Load global metadata (index.json)
 */
export declare function loadGlobalMetadata(): Promise<GlobalMetadata>;
/**
 * Load topic index
 */
export declare function loadTopicIndex(topicId: string): Promise<TopicIndex>;
/**
 * Load year index
 */
export declare function loadYearIndex(year: string): Promise<YearIndex>;
/**
 * Load individual video data
 */
export declare function loadVideoData(year: string, videoId: string): Promise<WWDCVideo>;
//# sourceMappingURL=wwdc-data-source.d.ts.map