/**
 * Configuration constants for Apple Docs MCP
 */
export declare const API_LIMITS: {
    readonly MAX_SEARCH_RESULTS: 50;
    readonly MAX_RELATED_APIS: 10;
    readonly MAX_REFERENCES: 50;
    readonly MAX_SIMILAR_APIS: 15;
    readonly MAX_FRAMEWORK_DEPTH: 10;
    readonly DEFAULT_FRAMEWORK_DEPTH: 3;
    readonly DEFAULT_FRAMEWORK_SYMBOLS_LIMIT: 50;
    readonly DEFAULT_DOCUMENTATION_UPDATES_LIMIT: 50;
    readonly DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT: 50;
    readonly DEFAULT_SAMPLE_CODE_LIMIT: 50;
    readonly DEFAULT_TECHNOLOGIES_LIMIT: 200;
    readonly DEFAULT_REFERENCES_LIMIT: 20;
    readonly MAX_FRAMEWORK_SYMBOLS_LIMIT: 200;
    readonly MAX_DOCUMENTATION_UPDATES_LIMIT: 200;
    readonly MAX_TECHNOLOGY_OVERVIEWS_LIMIT: 200;
    readonly MAX_SAMPLE_CODE_LIMIT: 200;
    readonly MAX_TECHNOLOGIES_LIMIT: 500;
    readonly MAX_REFERENCES_LIMIT: 50;
};
export declare const SEARCH_DEPTH_LIMITS: {
    readonly shallow: 5;
    readonly medium: 10;
    readonly deep: 15;
};
export declare const CACHE_TTL: {
    readonly API_DOCS: number;
    readonly FRAMEWORK_INDEX: number;
    readonly TECHNOLOGIES: number;
    readonly UPDATES: number;
    readonly SAMPLE_CODE: number;
    readonly TECHNOLOGY_OVERVIEWS: number;
};
export declare const CACHE_SIZE: {
    readonly API_DOCS: 500;
    readonly FRAMEWORK_INDEX: 100;
    readonly TECHNOLOGIES: 50;
    readonly UPDATES: 100;
    readonly SAMPLE_CODE: 100;
    readonly TECHNOLOGY_OVERVIEWS: 100;
    readonly WWDC_DATA: 100;
    readonly DEFAULT_CACHE_SIZE: 1000;
    readonly DEFAULT_CACHE_TTL: number;
};
export declare const DEFAULT_SAFARI_USER_AGENT = "Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
export declare const REQUEST_CONFIG: {
    readonly TIMEOUT: 30000;
    readonly MAX_RETRIES: 3;
    readonly RETRY_DELAY: 1000;
    readonly MAX_CONCURRENT_REQUESTS: 5;
    readonly DEFAULT_SAFARI_USER_AGENT: "Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
};
export declare const RATE_LIMIT: {
    readonly MAX_REQUESTS_PER_MINUTE: 100;
    readonly WINDOW_MS: 60000;
};
export declare const PROCESSING_LIMITS: {
    readonly MAX_COLLECTIONS_TO_SHOW: 5;
    readonly MAX_RELATED_APIS_PER_SECTION: 3;
    readonly MAX_PLATFORM_COMPATIBILITY_ITEMS: 2;
    readonly MAX_SIMILAR_APIS_FOR_DEEP_SEARCH: 3;
    readonly MAX_TOPIC_IDENTIFIERS: 4;
    readonly MAX_DOC_FETCHER_RELATED_APIS: 10;
    readonly MAX_DOC_FETCHER_REFERENCES: 15;
    readonly MAX_DOC_FETCHER_SIMILAR_APIS: 8;
    readonly MAX_DOC_FETCHER_REFS_PER_TYPE: 5;
};
export declare const APPLE_URLS: {
    readonly BASE: "https://developer.apple.com";
    readonly SEARCH: "https://developer.apple.com/search/";
    readonly DOCUMENTATION: "https://developer.apple.com/documentation/";
    readonly TUTORIALS_DATA: "https://developer.apple.com/tutorials/data/";
    readonly TECHNOLOGIES_JSON: "https://developer.apple.com/tutorials/data/documentation/technologies.json";
    readonly UPDATES_JSON: "https://developer.apple.com/tutorials/data/documentation/Updates.json";
    readonly UPDATES_INDEX_JSON: "https://developer.apple.com/tutorials/data/index/updates";
    readonly TECHNOLOGY_OVERVIEWS_JSON: "https://developer.apple.com/tutorials/data/documentation/TechnologyOverviews.json";
    readonly TECHNOLOGY_OVERVIEWS_INDEX_JSON: "https://developer.apple.com/tutorials/data/index/technologyoverviews";
    readonly SAMPLE_CODE_JSON: "https://developer.apple.com/tutorials/data/documentation/SampleCode.json";
    readonly SAMPLE_CODE_INDEX_JSON: "https://developer.apple.com/tutorials/data/index/samplecode";
};
export declare const WWDC_CONFIG: {
    readonly CODE_TAB_INTRODUCED_YEAR: 2022;
    readonly DEFAULT_VIDEO_LIMIT: 50;
    readonly DEFAULT_CODE_EXAMPLES_LIMIT: 30;
    readonly DEFAULT_SEARCH_LIMIT: 20;
    readonly DEFAULT_RELATED_VIDEOS_LIMIT: 15;
    readonly DEFAULT_TOPIC_VIDEOS_LIMIT: 20;
    readonly MAX_VIDEO_LIMIT: 200;
    readonly MAX_CODE_EXAMPLES_LIMIT: 100;
    readonly MAX_SEARCH_LIMIT: 100;
    readonly MAX_RELATED_VIDEOS_LIMIT: 50;
    readonly MAX_TOPIC_VIDEOS_LIMIT: 100;
    readonly MIN_CODE_LENGTH: 10;
    readonly CACHE_TTL: number;
};
export declare const ERROR_MESSAGES: {
    readonly INVALID_URL: "URL must be from developer.apple.com";
    readonly FETCH_FAILED: "Failed to fetch data from Apple Developer Documentation";
    readonly PARSE_FAILED: "Failed to parse response data";
    readonly NOT_FOUND: "Documentation not found (404). This URL may have been moved or removed.";
    readonly TIMEOUT: "Request timed out. Please try again later.";
    readonly NETWORK_ERROR: "Network error occurred. Please check your connection.";
    readonly RATE_LIMITED: "Request rate limit exceeded. Please wait before trying again.";
    readonly API_ERROR: "API error occurred while processing the request.";
    readonly CACHE_ERROR: "Cache operation failed, but the request will continue.";
    readonly VALIDATION_ERROR: "Input validation failed. Please check your parameters.";
    readonly SERVICE_UNAVAILABLE: "Apple Developer Documentation service is temporarily unavailable.";
};
//# sourceMappingURL=constants.d.ts.map