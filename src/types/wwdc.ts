/**
 * WWDC video data type definitions
 */

/**
 * Transcript segment
 */
export interface TranscriptSegment {
  timestamp: string;  // "00:00" format
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
  timestamp?: string;  // "05:30" format, may be absent
  title?: string;      // Code title or description
  language: string;    // "swift", "objc", "javascript", etc.
  code: string;        // Code content
  context?: string;    // Code context description
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
  hdVideo?: string;        // HD video download link
  sdVideo?: string;        // SD video download link
  sampleProject?: string;  // Sample project download link
  slides?: string;         // Slides download link
  resourceLinks?: ResourceLink[];  // Resource links
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
  id: string;              // Video ID, e.g. "238"
  year: string;            // Year, e.g. "2025"
  url: string;             // Full URL
  title: string;           // Video title
  speakers?: string[];     // List of speakers
  duration: string;        // Duration, e.g. "15:30"
  topics: string[];        // Topic tags (standard categories)
  hasTranscript: boolean;  // Whether a transcript is available
  hasCode: boolean;        // Whether code examples are available
  transcript?: TranscriptData;
  codeExamples?: CodeExample[];
  chapters?: Chapter[];    // Chapter info
  resources: VideoResources;
  relatedVideos?: RelatedVideo[];  // Related videos
  extractedAt?: string;    // Extraction time, ISO 8601
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
  hasCodeTab: boolean;     // Whether this year has a separate Code tab
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
  concurrency?: number;    // Concurrency, default 5
  retryAttempts?: number;  // Retry attempts, default 3
  timeout?: number;        // Timeout in milliseconds
  skipExisting?: boolean;  // Skip videos that already exist
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