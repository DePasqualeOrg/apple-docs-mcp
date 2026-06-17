import { convertToJsonApiUrl, toAbsoluteAppleUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-handler.js';
import { PROCESSING_LIMITS, SEARCH_DEPTH_LIMITS } from '../utils/constants.js';
/**
 * Find similar APIs
 */
export async function handleFindSimilarApis(apiUrl, searchDepth = 'medium', filterByCategory, includeAlternatives = true) {
    try {
        logger.info(`Finding similar APIs for: ${apiUrl}`);
        const jsonApiUrl = convertToJsonApiUrl(apiUrl);
        // Check if conversion failed
        if (!jsonApiUrl) {
            throw new Error('Invalid Apple Developer Documentation URL');
        }
        const response = await httpClient.getJson(jsonApiUrl);
        // Handle response structure - check if data is wrapped
        let data;
        let references;
        if (response.data) {
            // Response has a data property, extract it
            data = response.data;
            references = response.references ?? data.references;
        }
        else {
            // Response is the data itself
            data = response;
            references = data.references;
        }
        // Collect similar APIs
        const similarApis = [];
        // 1. Collect from the "See Also" section
        if (data.seeAlsoSections) {
            const seeAlsoApis = extractSeeAlsoApis(data.seeAlsoSections, references, filterByCategory);
            similarApis.push(...seeAlsoApis);
        }
        // 2. Collect from topic sections (medium and deep modes)
        if (searchDepth === 'medium' || searchDepth === 'deep') {
            if (data.topicSections && includeAlternatives) {
                const topicApis = extractTopicApis(data.topicSections, references, filterByCategory);
                similarApis.push(...topicApis);
            }
        }
        // 3. Deep-search related APIs (deep mode)
        if (searchDepth === 'deep') {
            const deepApis = await extractDeepRelatedApis(similarApis.slice(0, PROCESSING_LIMITS.MAX_SIMILAR_APIS_FOR_DEEP_SEARCH)); // limit to the first 3
            similarApis.push(...deepApis);
        }
        // Deduplicate and score
        const uniqueApis = deduplicateAndScore(similarApis);
        // Sort by similarity
        uniqueApis.sort((a, b) => b.confidence - a.confidence);
        // Limit the number of results
        const maxResults = SEARCH_DEPTH_LIMITS[searchDepth] || SEARCH_DEPTH_LIMITS.medium;
        const limitedApis = uniqueApis.slice(0, maxResults);
        // Get the title from data
        const title = data.title ?? data.metadata?.title ?? data.identifier?.split('/').filter(Boolean).pop() ?? 'API';
        return formatSimilarApis(apiUrl, limitedApis, title, data);
    }
    catch (error) {
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes('Invalid Apple Developer Documentation URL')) {
            throw error;
        }
        throw new Error(errorMessage);
    }
}
/**
 * Extract APIs from the "See Also" section
 */
function extractSeeAlsoApis(seeAlsoSections, references, filterByCategory) {
    const apis = [];
    for (const section of seeAlsoSections) {
        // Filter by category
        if (filterByCategory && !section.title.toLowerCase().includes(filterByCategory.toLowerCase())) {
            continue;
        }
        // A "See Also" section that merely groups deprecated siblings (common on a
        // deprecated API's own page) is not a set of recommended alternatives. Score
        // it low so it doesn't masquerade as a strong match and sorts below genuine
        // topic siblings, rather than giving every deprecated sibling a flat 8/10.
        const sectionConfidence = /deprecated/i.test(section.title) ? 3 : 8;
        for (const identifier of section.identifiers) {
            const api = createSimilarApi(identifier, section.title, 'See Also', sectionConfidence, references);
            if (api) {
                apis.push(api);
            }
        }
    }
    return apis;
}
/**
 * Extract APIs from topic sections
 */
function extractTopicApis(topicSections, references, filterByCategory) {
    const apis = [];
    for (const section of topicSections) {
        // Filter by category
        if (filterByCategory && !section.title.toLowerCase().includes(filterByCategory.toLowerCase())) {
            continue;
        }
        // Limit the number of APIs per topic
        const limitedIdentifiers = section.identifiers.slice(0, PROCESSING_LIMITS.MAX_TOPIC_IDENTIFIERS);
        for (const identifier of limitedIdentifiers) {
            const api = createSimilarApi(identifier, section.title, 'Topic Group', 6, // medium similarity
            references);
            if (api) {
                apis.push(api);
            }
        }
    }
    return apis;
}
/**
 * Deep-search related APIs
 */
async function extractDeepRelatedApis(seedApis) {
    const deepApis = [];
    for (const seedApi of seedApis) {
        try {
            const jsonApiUrl = convertToJsonApiUrl(seedApi.url);
            if (!jsonApiUrl) {
                logger.warn(`Failed to convert URL: ${seedApi.url}`);
                continue;
            }
            const response = await httpClient.getJson(jsonApiUrl);
            // Handle response structure
            let data;
            let references;
            if (response.data) {
                data = response.data;
                references = response.references ?? data.references;
            }
            else {
                data = response;
                references = data.references;
            }
            // Only pull from the "See Also" section to avoid over-expanding
            if (data.seeAlsoSections) {
                const relatedApis = extractSeeAlsoApis(data.seeAlsoSections, references);
                // Lower the similarity score
                relatedApis.forEach(api => {
                    api.confidence = Math.max(api.confidence - 2, 3);
                    api.similarityType = 'Deep Related';
                });
                deepApis.push(...relatedApis);
            }
        }
        catch (error) {
            logger.error(`Failed to fetch deep related API ${seedApi.url}:`, error);
        }
    }
    return deepApis;
}
/**
 * Create a similar-API object
 */
function createSimilarApi(identifier, category, similarityType, confidence, references) {
    if (references?.[identifier]) {
        const ref = references[identifier];
        return {
            title: ref.title ?? 'Unknown',
            url: toAbsoluteAppleUrl(ref.url),
            identifier,
            abstract: ref.abstract ? ref.abstract.map((a) => a.text ?? '').join(' ').trim() : undefined,
            category,
            similarityType,
            symbolKind: ref.kind ?? ref.symbolKind,
            platforms: ref.platforms ? ref.platforms.flatMap((p) => (p.name ? [p.name] : [])) : undefined,
            confidence,
        };
    }
    // If not in references, try to parse from the identifier
    if (identifier.startsWith('doc://')) {
        const parts = identifier.split('/');
        const apiName = parts[parts.length - 1] || 'Unknown';
        const pathPart = identifier.replace(/^doc:\/\/[^/]+\/documentation\//, '');
        return {
            title: apiName,
            url: `https://developer.apple.com/documentation/${pathPart}`,
            identifier,
            category,
            similarityType,
            confidence: confidence - 1, // slightly lower similarity
        };
    }
    return null;
}
/**
 * Deduplicate and score
 */
function deduplicateAndScore(apis) {
    const apiMap = new Map();
    for (const api of apis) {
        const existing = apiMap.get(api.identifier);
        if (existing) {
            // If already present, keep the higher-scored one
            if (api.confidence > existing.confidence) {
                apiMap.set(api.identifier, api);
            }
        }
        else {
            apiMap.set(api.identifier, api);
        }
    }
    return Array.from(apiMap.values());
}
/**
 * Format the similar-API results
 */
function formatSimilarApis(originalUrl, similarApis, originalApiName, originalData) {
    const apiName = originalApiName ?? new URL(originalUrl).pathname.split('/').filter(Boolean).pop() ?? 'API';
    let content = `# Similar APIs to ${apiName}\n\n`;
    if (similarApis.length === 0) {
        content += 'No similar APIs found';
        return content;
    }
    // Add metadata about the original API if available
    if (originalData?.metadata) {
        const roleHeading = originalData.metadata.roleHeading ?? '';
        const platforms = originalData.metadata.platforms?.map(p => `${p.name} ${p.introducedAt ?? ''}+`).join(', ') ?? '';
        if (roleHeading || platforms) {
            content += `${roleHeading}${platforms ? ' · ' + platforms : ''}\n\n`;
        }
    }
    content += `**Source:** [${originalUrl}](${originalUrl})\n\n`;
    content += `**Found ${similarApis.length} similar APIs (sorted by relevance):**\n\n`;
    // Group by category instead of similarity type for better organization
    const groupedByCategory = new Map();
    for (const api of similarApis) {
        const key = `${api.similarityType}: ${api.category}`;
        if (!groupedByCategory.has(key)) {
            groupedByCategory.set(key, []);
        }
        groupedByCategory.get(key).push(api);
    }
    for (const [categoryKey, apis] of groupedByCategory) {
        content += `## ${categoryKey}\n\n`;
        for (const api of apis) {
            content += formatSingleSimilarApi(api);
        }
    }
    // Similarity analysis
    content += '## Similarity Analysis\n\n';
    const avgConfidence = similarApis.reduce((sum, api) => sum + api.confidence, 0) / similarApis.length;
    content += `**Average Similarity:** ${avgConfidence.toFixed(1)}/10\n`;
    const highConfidenceApis = similarApis.filter(api => api.confidence >= 7);
    if (highConfidenceApis.length > 0) {
        content += `**Highly Similar APIs:** ${highConfidenceApis.length}\n`;
    }
    const categories = [...new Set(similarApis.map(api => api.category))];
    content += `**Categories:** ${categories.join(', ')}\n\n`;
    content += `---\n\n*Total: ${similarApis.length} similar APIs found*`;
    return content;
}
/**
 * Format a single similar API
 */
function formatSingleSimilarApi(api) {
    let content = `### [${api.title}](${api.url})\n`;
    if (api.abstract) {
        content += `${api.abstract}\n\n`;
    }
    // Add metadata
    const metadata = [`Similarity: ${api.confidence}/10`];
    if (api.symbolKind) {
        metadata.push(`Type: ${api.symbolKind}`);
    }
    if (api.category !== api.similarityType) {
        metadata.push(`Category: ${api.category}`);
    }
    content += `*${metadata.join(' | ')}*\n\n`;
    // Add platform information
    if (api.platforms && api.platforms.length > 0) {
        content += `**Platforms:** ${api.platforms.join(', ')}\n\n`;
    }
    return content;
}
//# sourceMappingURL=find-similar-apis.js.map