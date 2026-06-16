import type { SearchResult, AppleSearchResponse } from './search-result-parser.js';
import { mapSearchResults } from './search-result-parser.js';
import { API_LIMITS, APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';

/**
 * Apple's developer search is backed by this JSON API (the one the
 * developer.apple.com/search page itself calls). It returns structured results,
 * so the tool no longer scrapes HTML. The host is internal/undocumented, so the
 * tool degrades gracefully (see formatSearchUnavailable) if it changes.
 */
const SEARCH_API_URL = 'https://devintserv.msc.sbz.apple.com/api/v1/search';

/**
 * Formats search results for display
 */
export function formatSearchResults(
  results: SearchResult[],
  query: string,
  filterType: string,
  searchUrl: string,
): string {
  let content = '';

  // Add header
  content += '# Apple Documentation Search Results\n\n';
  content += `**Query:** "${query}"\n`;
  content += `**Filter:** ${filterType}\n`;
  content += `**Results found:** ${results.length}\n\n`;

  // Check if query might be video-related
  const videoSuggestion = getVideoSuggestion(query);
  if (videoSuggestion) {
    content += videoSuggestion;
  }

  if (results.length === 0) {
    content += formatNoResultsMessage(query, filterType, searchUrl);
    return content;
  }

  // Group results by type
  const groupedResults = groupResultsByType(results);

  // Format each group
  Object.entries(groupedResults).forEach(([type, typeResults]) => {
    content += formatResultGroup(type, typeResults);
  });

  // Add footer
  content += formatSearchFooter(searchUrl);

  return content;
}

/**
 * Format no results message
 */
function formatNoResultsMessage(query: string, filterType: string, searchUrl: string): string {
  let content = '## No Results Found\n\n';
  content += `No ${filterType === 'all' ? '' : filterType + ' '}results found for "${query}".\n\n`;
  content += '### Suggestions:\n';
  content += '- Try using different keywords\n';
  content += '- Check spelling\n';
  content += '- Use more general terms\n';
  content += '- Try searching for framework names (e.g., "SwiftUI", "UIKit")\n';

  // Add video-specific suggestion if applicable
  const videoSuggestion = getVideoSuggestion(query);
  if (videoSuggestion) {
    content += '- For WWDC videos, use the dedicated WWDC tools\n';
  }

  // An empty result can also mean the search endpoint changed or rate-limited the
  // request — not necessarily that there are no matches. Point to the tools that
  // address Apple's documentation directly when the framework or URL is known.
  content += '\n### More direct than search\n';
  content += 'If you already know the framework or page, these reach it directly:\n';
  content += '- `get_apple_doc_content` — fetch a page when you know its URL\n';
  content += '- `list_technologies` — browse frameworks by category\n';
  content += '- `search_framework_symbols` — search symbols within a known framework\n';

  content += `\n[View search on Apple Developer](${searchUrl})`;
  return content;
}

/**
 * Group results by type
 */
function groupResultsByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const groups: Record<string, SearchResult[]> = {};

  results.forEach(result => {
    const displayType = getDisplayType(result.type);
    if (!groups[displayType]) {
      groups[displayType] = [];
    }
    groups[displayType].push(result);
  });

  return groups;
}

/**
 * Get display type for result
 */
function getDisplayType(type: string): string {
  const typeDisplayNames: Record<string, string> = {
    'documentation': '📚 API Documentation',
    'documentation-article': '📄 Articles',
    'documentation-tutorial': '📖 Tutorials',
    'sample-code': '💻 Sample Code',
    'guide': '📋 Guides',
  };

  return typeDisplayNames[type] || '📝 Other';
}

/**
 * Format a group of results
 */
function formatResultGroup(type: string, results: SearchResult[]): string {
  let content = `## ${type}\n\n`;

  results.forEach((result, index) => {
    content += formatSingleResult(result, index + 1);
  });

  return content;
}

/**
 * Format a single search result
 */
function formatSingleResult(result: SearchResult, index: number): string {
  let content = `### ${index}. ${result.title}`;

  // Add badges
  const badges = [];
  if (result.beta) {
    badges.push('🧪 Beta');
  }
  if (badges.length > 0) {
    content += ` ${badges.join(' ')}`;
  }

  content += '\n\n';

  // Add metadata
  if (result.framework) {
    content += `**Framework:** ${result.framework}\n`;
  }
  content += `**Type:** ${result.type.replace(/-/g, ' ')}\n`;

  // Add description
  if (result.description) {
    content += `**Description:** ${result.description}\n`;
  }

  // Add URL
  content += `**URL:** ${result.url}\n\n`;

  return content;
}

/**
 * Format search footer
 */
function formatSearchFooter(searchUrl: string): string {
  return `---\n\n[View all results on Apple Developer](${searchUrl})`;
}

/**
 * Check if query might be video-related and provide WWDC tool suggestions
 */
function getVideoSuggestion(query: string): string | null {
  const videoKeywords = [
    'video', 'wwdc', 'session', 'presentation', 'talk', 'keynote',
    'demo', 'tutorial', 'walkthrough', 'overview', 'introduction',
    'deep dive', 'best practices', 'tips', 'tricks',
  ];

  const queryLower = query.toLowerCase();
  const hasVideoKeyword = videoKeywords.some(keyword => queryLower.includes(keyword));

  // Also check for year patterns (e.g., "2024", "2025", "wwdc24")
  const hasYearPattern = /\b(20[2-9][0-9]|wwdc[2-9][0-9])\b/i.test(query);

  if (hasVideoKeyword || hasYearPattern) {
    return `## 💡 Looking for WWDC Videos?

This search covers documentation and samples, but not WWDC videos. For WWDC content, try these tools:

- **\`list_wwdc_videos\`** - Browse WWDC videos by year, topic, or code availability
- **\`search_wwdc_content\`** - Search through video transcripts and code examples
- **\`browse_wwdc_topics\`** - Explore videos organized by topic categories

---

`;
  }

  return null;
}

/**
 * Message shown when the search API itself fails (network error, or Apple
 * changed/removed the internal endpoint). Distinct from "no matches": it routes
 * the caller to the JSON-API-backed tools that do not depend on this endpoint.
 */
function formatSearchUnavailable(query: string, searchUrl: string): string {
  return `# Apple Documentation Search

Search is temporarily unavailable for "${query}". The search API may have changed or the request was rate-limited — this does not mean there are no matches.

These tools query Apple's documentation JSON API directly and do not depend on the search endpoint:

- **\`get_apple_doc_content\`** — fetch a page directly when you know its URL (e.g. https://developer.apple.com/documentation/swiftui/view)
- **\`list_technologies\`** — browse frameworks by category
- **\`search_framework_symbols\`** — search symbols within a known framework

[Open this search on Apple Developer](${searchUrl})
`;
}

/**
 * Search Apple Developer Documentation via Apple's search JSON API and return a
 * formatted MCP response.
 */
export async function fetchAppleDocsSearch(
  query: string,
  filterType: string = 'all',
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const searchUrl = `${APPLE_URLS.SEARCH}?q=${encodeURIComponent(query)}`;
  try {
    const data = await httpClient.postJson<AppleSearchResponse>(SEARCH_API_URL, {
      text: query,
      targetResultLocale: 'en',
    });

    const results: SearchResult[] = mapSearchResults(data, filterType).slice(
      0,
      API_LIMITS.MAX_SEARCH_RESULTS,
    );

    return {
      content: [{ type: 'text', text: formatSearchResults(results, query, filterType, searchUrl) }],
    };
  } catch (error) {
    logger.error('Apple search request failed:', error);
    return {
      content: [{ type: 'text', text: formatSearchUnavailable(query, searchUrl) }],
    };
  }
}