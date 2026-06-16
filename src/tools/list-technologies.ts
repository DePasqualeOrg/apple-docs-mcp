import { technologiesCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS, API_LIMITS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-handler.js';

/**
 * Technology info
 */
interface Technology {
  title: string;
  identifier: string;
  tags: string[];
  languages: string[];
  url?: string;
  destination?: {
    identifier: string;
  };
}

interface TechnologyGroup {
  name: string;
  technologies: Technology[];
}

interface TechnologiesData {
  sections: Array<{
    kind: string;
    groups: TechnologyGroup[];
  }>;
}

/**
 * Get the list of technologies
 */
export async function handleListTechnologies(
  category?: string,
  language?: string,
  includeBeta: boolean = true,
  limit: number = API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT,
): Promise<string> {
  try {
    logger.info('Fetching technologies list...');

    // Generate cache key
    const cacheKey = generateUrlCacheKey('technologies', { category, language, includeBeta, limit });

    // Try to get from cache first
    const cachedResult = technologiesCache.get<string>(cacheKey);
    if (cachedResult) {
      logger.debug('Technologies cache hit');
      return cachedResult;
    }

    // Fetch the technologies list
    const data = await httpClient.getJson<TechnologiesData>(APPLE_URLS.TECHNOLOGIES_JSON);

    // Parse the technologies list
    const technologies = parseTechnologies(data);

    // Apply filters
    const filteredTechnologies = applyTechnologyFilters(technologies, {
      category,
      language,
      includeBeta,
      limit,
    });

    // Format the output
    const result = formatTechnologiesList(filteredTechnologies);

    // Cache the result
    technologiesCache.set(cacheKey, result);

    return result;

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return `Error: Failed to list technologies: ${errorMessage}`;
  }
}

/**
 * Parse the technology data
 */
function parseTechnologies(data: TechnologiesData): TechnologyGroup[] {
  const groups: TechnologyGroup[] = [];

  if (data.sections) {
    data.sections.forEach(section => {
      if (section.kind === 'technologies' && section.groups) {
        section.groups.forEach(group => {
          if (group.technologies && Array.isArray(group.technologies)) {
            const technologies: Technology[] = group.technologies.map(tech => ({
              title: tech.title || '',
              identifier: tech.destination?.identifier ?? tech.identifier ?? '',
              tags: tech.tags || [],
              languages: tech.languages || [],
              url: tech.destination?.identifier
                ? tech.destination.identifier.replace('doc://com.apple.documentation/documentation/', 'https://developer.apple.com/documentation/')
                : undefined,
            }));

            groups.push({
              name: group.name,
              technologies,
            });
          }
        });
      }
    });
  }

  return groups;
}

/**
 * Normalize a category string for tolerant matching: lowercase, "&" → "and",
 * and strip every non-alphanumeric character. This collapses "Graphics & Games",
 * "graphics-and-games", and "graphics and games" to the same key.
 */
function normalizeCategory(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

/**
 * Apply filters
 */
function applyTechnologyFilters(
  groups: TechnologyGroup[],
  filters: {
    category?: string;
    language?: string;
    includeBeta?: boolean;
    limit?: number;
  },
): TechnologyGroup[] {
  let filteredGroups = groups
    .map(group => {
      // Filter by category. Match on a normalized form so slug-style inputs
      // ("graphics-and-games") and display names ("Graphics & Games") both work,
      // rather than only a raw substring of the display name.
      if (filters.category && !normalizeCategory(group.name).includes(normalizeCategory(filters.category))) {
        return null;
      }

      // Filter by technology
      const filteredTechnologies = group.technologies.filter(tech => {
        // Beta filter
        if (!filters.includeBeta && tech.tags.includes('Beta')) {
          return false;
        }

        // Language filter
        if (filters.language && !tech.languages.includes(filters.language)) {
          return false;
        }

        return true;
      });

      return filteredTechnologies.length > 0
        ? { ...group, technologies: filteredTechnologies }
        : null;
    })
    .filter((group): group is TechnologyGroup => group !== null);

  // Apply the limit
  if (filters.limit !== undefined && filters.limit >= 0) {
    if (filters.limit === 0) {
      // If limit is 0, return an empty array
      return [];
    }

    let totalCount = 0;
    filteredGroups = filteredGroups.map(group => {
      const availableSlots = filters.limit! - totalCount;
      if (availableSlots <= 0) {
        return null;
      }

      const limitedTechnologies = group.technologies.slice(0, availableSlots);
      totalCount += limitedTechnologies.length;

      return {
        ...group,
        technologies: limitedTechnologies,
      };
    }).filter((group): group is TechnologyGroup => group !== null && group.technologies.length > 0);
  }

  return filteredGroups;
}

/**
 * Format the technologies list
 */
function formatTechnologiesList(groups: TechnologyGroup[]): string {
  if (groups.length === 0) {
    return 'No technologies found matching the specified criteria.';
  }

  let content = '# Apple Developer Technologies\n\n';

  // Statistics
  const totalTechs = groups.reduce((sum, group) => sum + group.technologies.length, 0);
  const betaTechs = groups.reduce((sum, group) =>
    sum + group.technologies.filter(tech => tech.tags.includes('Beta')).length, 0);

  content += `*Found ${totalTechs} technologies`;
  if (betaTechs > 0) {
    content += ` (${betaTechs} in beta)`;
  }
  content += '*\n\n';

  // Display by category
  groups.forEach(group => {
    content += `## ${group.name}\n\n`;

    group.technologies.forEach(tech => {
      // Create title with status information
      const isBeta = tech.tags.includes('Beta');
      const titleWithStatus = isBeta ? `${tech.title} (Beta)` : tech.title;

      content += `### [${titleWithStatus}](${tech.url ?? '#'})\n`;

      // Build metadata array
      const metadata = [];

      // Add languages
      if (tech.languages.length > 0) {
        metadata.push(`Languages: ${tech.languages.join(', ')}`);
      }

      // Add categories (excluding Beta since it's in title)
      const nonBetaTags = tech.tags.filter(tag => tag !== 'Beta');
      if (nonBetaTags.length > 0) {
        metadata.push(`Categories: ${nonBetaTags.join(', ')}`);
      }

      // Add metadata line if any
      if (metadata.length > 0) {
        content += `*${metadata.join(' | ')}*\n`;
      }

      content += '\n';
    });
  });

  content += '\n---\n\n[View all technologies on Apple Developer](https://developer.apple.com/documentation/technologies)';

  return content;
}