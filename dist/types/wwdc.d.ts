/**
 * WWDC video data type definitions
 */
/**
 * Transcript segment
 */
export interface TranscriptSegment {
    timestamp: string;
    text: string;
}
/**
 * Transcript data
 */
export interface TranscriptData {
    fullText: string;
    segments: TranscriptSegment[];
}
/**
 * Code example
 */
export interface CodeExample {
    timestamp?: string;
    title?: string;
    language: string;
    code: string;
    context?: string;
}
/**
 * Resource link
 */
export interface ResourceLink {
    title: string;
    url: string;
}
/**
 * Video resources
 */
export interface VideoResources {
    hdVideo?: string;
    sdVideo?: string;
    sampleProject?: string;
    slides?: string;
    resourceLinks?: ResourceLink[];
}
/**
 * Related video
 */
export interface RelatedVideo {
    id: string;
    year: string;
    title: string;
    url: string;
}
/**
 * WWDC video data
 */
export interface WWDCVideo {
    id: string;
    year: string;
    url: string;
    title: string;
    speakers?: string[];
    duration: string;
    topics: string[];
    hasTranscript: boolean;
    hasCode: boolean;
    transcript?: TranscriptData;
    codeExamples?: CodeExample[];
    chapters?: Chapter[];
    resources: VideoResources;
    relatedVideos?: RelatedVideo[];
    extractedAt?: string;
}
/**
 * Video chapter
 */
export interface Chapter {
    title: string;
    timestamp: string;
    duration?: string;
}
/**
 * Year metadata
 */
export interface YearMetadata {
    year: string;
    totalVideos: number;
    hasCodeTab: boolean;
    extractedAt: string;
    lastUpdated?: string;
}
/**
 * WWDC year data
 */
export interface WWDCYearData {
    metadata: YearMetadata;
    videos: WWDCVideo[];
}
/**
 * Global metadata
 */
export interface GlobalMetadata {
    version: string;
    lastUpdated: string;
    totalVideos: number;
    topics: Array<{
        id: string;
        name: string;
        url: string;
    }>;
    years: string[];
    statistics: {
        byTopic: Record<string, number>;
        byYear: Record<string, number>;
        videosWithCode: number;
        videosWithTranscript: number;
        videosWithResources: number;
    };
}
/**
 * Topic index
 */
export interface TopicIndex {
    id: string;
    name: string;
    videoCount: number;
    years: string[];
    videos: Array<{
        id: string;
        year: string;
        title: string;
        topics: string[];
        duration: string;
        hasCode: boolean;
        hasTranscript: boolean;
        url: string;
        dataFile: string;
    }>;
}
/**
 * Year index
 */
export interface YearIndex {
    year: string;
    videoCount: number;
    topics: string[];
    videos: Array<{
        id: string;
        year: string;
        title: string;
        topics: string[];
        duration: string;
        hasCode: boolean;
        hasTranscript: boolean;
        url: string;
        dataFile: string;
    }>;
}
/**
 * The complete WWDC dataset
 */
export interface WWDCDataset {
    wwdc: Record<string, WWDCYearData>;
    globalMetadata: GlobalMetadata;
}
/**
 * Video list item (used for list-page extraction)
 */
export interface VideoListItem {
    id: string;
    url: string;
    title: string;
    duration?: string;
    thumbnail?: string;
}
/**
 * Extraction config
 */
export interface ExtractorConfig {
    year: string;
    concurrency?: number;
    retryAttempts?: number;
    timeout?: number;
    skipExisting?: boolean;
}
/**
 * Extraction progress
 */
export interface ExtractProgress {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    currentVideo?: string;
    errors: Array<{
        videoId: string;
        error: string;
    }>;
}
//# sourceMappingURL=wwdc.d.ts.map