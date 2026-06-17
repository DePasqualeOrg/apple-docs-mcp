import { convertToJsonApiUrl, toAbsoluteAppleUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-handler.js';
import { PROCESSING_LIMITS } from '../utils/constants.js';
/**
 * Get platform compatibility analysis
 */
export async function handleGetPlatformCompatibility(apiUrl, compareMode = 'single', includeRelated = false) {
    try {
        logger.info(`Analyzing platform compatibility for: ${apiUrl}`);
        const analysis = compareMode === 'framework'
            ? await analyzeFrameworkCompatibility(apiUrl, includeRelated)
            : await analyzeSingleApiCompatibility(apiUrl, includeRelated);
        // Collapse any stacked blank-line runs the section builders accumulate.
        // Compatibility output contains no code blocks, so this only affects spacing.
        return analysis.replace(/\n{3,}/g, '\n\n');
    }
    catch (error) {
        const errorMessage = getErrorMessage(error);
        return `Error: Failed to analyze platform compatibility: ${errorMessage}`;
    }
}
/**
 * Analyze a single API's platform compatibility
 */
async function analyzeSingleApiCompatibility(apiUrl, includeRelated) {
    const jsonApiUrl = convertToJsonApiUrl(apiUrl);
    if (!jsonApiUrl) {
        throw new Error('Invalid Apple Developer Documentation URL');
    }
    const data = await httpClient.getJson(jsonApiUrl);
    if (!data.metadata?.platforms) {
        return `No platform information available for: ${apiUrl}`;
    }
    const analysis = analyzeCompatibility(data.metadata.title ?? 'Unknown API', apiUrl, data.metadata.platforms);
    let result = formatCompatibilityAnalysis(analysis);
    // If related-API compatibility info should be included
    if (includeRelated && data.topicSections) {
        const relatedAnalyses = await analyzeRelatedCompatibility(data, 3); // limit to 3 related APIs
        if (relatedAnalyses.length > 0) {
            // formatCompatibilityAnalysis already ends with a blank line, so don't add
            // another leading one here (would make a triple blank line).
            result += '## Related APIs Compatibility\n\n';
            for (const relatedAnalysis of relatedAnalyses) {
                result += formatCompatibilityAnalysis(relatedAnalysis, true) + '\n';
            }
        }
    }
    return result;
}
/**
 * Analyze a framework's platform compatibility
 */
async function analyzeFrameworkCompatibility(frameworkUrl, includeRelated) {
    // This could be extended to analyze the whole framework's compatibility
    // For now, use the single-API analysis as the basis
    return await analyzeSingleApiCompatibility(frameworkUrl, includeRelated);
}
/**
 * Analyze related APIs' compatibility
 */
async function analyzeRelatedCompatibility(data, maxRelated = 3) {
    const analyses = [];
    if (!data.topicSections || !data.references) {
        return analyses;
    }
    let count = 0;
    for (const section of data.topicSections) {
        if (count >= maxRelated) {
            break;
        }
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_PLATFORM_COMPATIBILITY_ITEMS)) { // at most 2 per section
            if (count >= maxRelated) {
                break;
            }
            const ref = data.references[identifier];
            if (ref?.url) {
                try {
                    const relatedUrl = toAbsoluteAppleUrl(ref.url);
                    const relatedJsonUrl = convertToJsonApiUrl(relatedUrl);
                    if (!relatedJsonUrl) {
                        logger.warn(`Failed to convert URL: ${relatedUrl}`);
                        continue;
                    }
                    const relatedData = await httpClient.getJson(relatedJsonUrl);
                    if (relatedData.metadata?.platforms) {
                        const analysis = analyzeCompatibility(ref.title ?? 'Unknown', relatedUrl, relatedData.metadata.platforms);
                        analyses.push(analysis);
                        count++;
                    }
                }
                catch (error) {
                    // Ignore errors from individual related APIs
                    logger.error(`Failed to fetch related API ${identifier}:`, error);
                }
            }
        }
    }
    return analyses;
}
/**
 * Analyze compatibility data
 */
function analyzeCompatibility(apiName, apiUrl, platforms) {
    const supportedPlatforms = [];
    const betaPlatforms = [];
    const deprecatedPlatforms = [];
    const minVersions = {};
    for (const platform of platforms) {
        supportedPlatforms.push(platform.name);
        if (platform.beta) {
            betaPlatforms.push(platform.name);
        }
        if (platform.deprecated) {
            deprecatedPlatforms.push(platform.name);
        }
        if (platform.introducedAt) {
            minVersions[platform.name] = platform.introducedAt;
        }
    }
    return {
        apiName,
        apiUrl,
        platforms,
        supportedPlatforms,
        betaPlatforms,
        deprecatedPlatforms,
        minVersions,
        crossPlatformSupport: supportedPlatforms.length > 1,
    };
}
/**
 * Format the compatibility analysis results
 */
function formatCompatibilityAnalysis(analysis, isRelated = false) {
    const prefix = isRelated ? '### ' : '# ';
    let content = `${prefix}Platform Compatibility: ${analysis.apiName}\n\n`;
    if (!isRelated) {
        content += `**API:** [${analysis.apiUrl}](${analysis.apiUrl})\n\n`;
    }
    // Platform support overview
    content += '## Platform Support Summary\n\n';
    content += `**Supported Platforms:** ${analysis.supportedPlatforms.join(', ')}\n`;
    content += `**Cross-Platform:** ${analysis.crossPlatformSupport ? 'Yes' : 'No'}\n`;
    if (analysis.betaPlatforms.length > 0) {
        content += `**Beta Platforms:** ${analysis.betaPlatforms.join(', ')}\n`;
    }
    if (analysis.deprecatedPlatforms.length > 0) {
        content += `**Deprecated Platforms:** ${analysis.deprecatedPlatforms.join(', ')}\n`;
    }
    content += '\n';
    // Detailed platform information
    content += '## Detailed Platform Information\n\n';
    for (const platform of analysis.platforms) {
        content += `**${platform.name}**\n`;
        if (platform.introducedAt) {
            content += `- Introduced: ${platform.introducedAt}\n`;
        }
        if (platform.deprecatedAt) {
            content += `- Deprecated: ${platform.deprecatedAt}\n`;
        }
        if (platform.obsoletedAt) {
            content += `- Obsoleted: ${platform.obsoletedAt}\n`;
        }
        const status = [];
        if (platform.beta) {
            status.push('Beta');
        }
        if (platform.deprecated) {
            status.push('Deprecated');
        }
        if (platform.unavailable) {
            status.push('Unavailable');
        }
        if (status.length > 0) {
            content += `- Status: ${status.join(', ')}\n`;
        }
        if (platform.message) {
            content += `- Note: ${platform.message}\n`;
        }
        content += '\n';
    }
    // Compatibility recommendations
    content += '## Compatibility Recommendations\n\n';
    if (analysis.crossPlatformSupport) {
        content += `✅ **Cross-platform compatible** - This API works across ${analysis.supportedPlatforms.length} platforms\n\n`;
    }
    else {
        content += `⚠️ **Platform-specific** - This API is only available on ${analysis.supportedPlatforms[0]}\n\n`;
    }
    if (analysis.betaPlatforms.length > 0) {
        content += '🚧 **Beta platforms** - Some platforms are in beta, expect changes\n\n';
    }
    if (analysis.deprecatedPlatforms.length > 0) {
        content += '⚠️ **Deprecated platforms** - Consider migration plans for deprecated platforms\n\n';
    }
    // Minimum version requirements
    if (Object.keys(analysis.minVersions).length > 0) {
        content += '## Minimum Version Requirements\n\n';
        for (const [platform, version] of Object.entries(analysis.minVersions)) {
            content += `- **${platform}:** ${version}+\n`;
        }
        content += '\n';
    }
    return content;
}
//# sourceMappingURL=get-platform-compatibility.js.map