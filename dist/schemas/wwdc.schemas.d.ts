/**
 * Zod schemas for WWDC tools
 */
import { z } from 'zod';
/**
 * Schema for list_wwdc_videos
 */
export declare const listWWDCVideosSchema: z.ZodObject<{
    year: z.ZodOptional<z.ZodString>;
    topic: z.ZodOptional<z.ZodString>;
    hasCode: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Schema for search_wwdc_content
 */
export declare const searchWWDCContentSchema: z.ZodObject<{
    query: z.ZodString;
    searchIn: z.ZodDefault<z.ZodEnum<{
        code: "code";
        transcript: "transcript";
        both: "both";
    }>>;
    year: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Schema for get_wwdc_video
 */
export declare const getWWDCVideoSchema: z.ZodObject<{
    year: z.ZodString;
    videoId: z.ZodString;
    includeTranscript: z.ZodDefault<z.ZodBoolean>;
    includeCode: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Schema for get_wwdc_code_examples
 */
export declare const getWWDCCodeExamplesSchema: z.ZodObject<{
    framework: z.ZodOptional<z.ZodString>;
    topic: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Schema for browse_wwdc_topics
 */
export declare const browseWWDCTopicsSchema: z.ZodObject<{
    topicId: z.ZodOptional<z.ZodString>;
    includeVideos: z.ZodDefault<z.ZodBoolean>;
    year: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Schema for find_related_wwdc_videos
 */
export declare const findRelatedWWDCVideosSchema: z.ZodObject<{
    videoId: z.ZodString;
    year: z.ZodString;
    includeExplicitRelated: z.ZodDefault<z.ZodBoolean>;
    includeTopicRelated: z.ZodDefault<z.ZodBoolean>;
    includeYearRelated: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=wwdc.schemas.d.ts.map