import { convertToJsonApiUrl, toAbsoluteAppleUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-handler.js';
import { PROCESSING_LIMITS } from '../utils/constants.js';

/**
 * Related API info
 */
interface RelatedAPI {
  title: string;
  url: string;
  identifier: string;
  type: string;
  relationship: string;
  abstract?: string;
}

interface RelationshipSection {
  type: string;
  title: string;
  identifiers: string[];
}

interface SeeAlsoSection {
  title: string;
  identifiers: string[];
}

/**
 * A single entry in Apple's render-JSON `references` map (only the fields used
 * here are modeled).
 */
interface DocReference {
  title?: string;
  url?: string;
  kind?: string;
  type?: string;
  abstract?: Array<{ text?: string }>;
}

interface AppleDocData {
  relationshipsSections?: RelationshipSection[];
  seeAlsoSections?: SeeAlsoSection[];
  references?: Record<string, DocReference>;
  topicSections?: Array<{
    title: string;
    identifiers: string[];
  }>;
}

/**
 * Get related APIs
 */
export async function handleGetRelatedApis(
  apiUrl: string,
  includeInherited: boolean = true,
  includeConformance: boolean = true,
  includeSeeAlso: boolean = true,
): Promise<string> {
  try {
    logger.info(`Fetching related APIs for: ${apiUrl}`);

    // Convert the web URL to a JSON API URL
    const jsonApiUrl = convertToJsonApiUrl(apiUrl);

    if (!jsonApiUrl) {
      throw new Error('Invalid Apple Developer Documentation URL');
    }

    const data = await httpClient.getJson<AppleDocData>(jsonApiUrl);

    // Collect all related APIs
    const relatedApis: RelatedAPI[] = [];

    // Process the relationships sections (inheritance, conformance, etc.)
    if (data.relationshipsSections) {
      for (const section of data.relationshipsSections) {
        const shouldInclude =
          (includeInherited && (section.type === 'inheritsFrom' || section.type === 'inheritedBy')) ||
          (includeConformance && (section.type === 'conformsTo' || section.type === 'conformingTypes'));

        if (shouldInclude && section.identifiers) {
          for (const identifier of section.identifiers) {
            const api = extractApiFromIdentifier(identifier, section.title, data.references);
            if (api) {
              relatedApis.push(api);
            }
          }
        }
      }
    }

    // Process the "See Also" section
    if (includeSeeAlso && data.seeAlsoSections) {
      for (const section of data.seeAlsoSections) {
        if (section.identifiers) {
          for (const identifier of section.identifiers) {
            const api = extractApiFromIdentifier(identifier, `See Also: ${section.title}`, data.references);
            if (api) {
              relatedApis.push(api);
            }
          }
        }
      }
    }

    // Process related APIs from the topic sections
    if (data.topicSections) {
      for (const section of data.topicSections) {
        if (section.identifiers && section.identifiers.length > 0) {
          // take only the first 3 to avoid too many
          const limitedIdentifiers = section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION);
          for (const identifier of limitedIdentifiers) {
            const api = extractApiFromIdentifier(identifier, `Related: ${section.title}`, data.references);
            if (api) {
              relatedApis.push(api);
            }
          }
        }
      }
    }

    // Deduplicate
    const uniqueApis = deduplicateApis(relatedApis);

    // Format the output
    return formatRelatedApis(apiUrl, uniqueApis);

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return `Error: Failed to get related APIs: ${errorMessage}`;
  }
}



/**
 * Extract API info from an identifier
 */
function extractApiFromIdentifier(
  identifier: string,
  relationship: string,
  references?: Record<string, DocReference>,
): RelatedAPI | null {
  // First look in references
  if (references?.[identifier]) {
    const ref = references[identifier];
    return {
      title: ref.title ?? 'Unknown',
      url: toAbsoluteAppleUrl(ref.url),
      identifier,
      type: ref.kind ?? ref.type ?? 'unknown',
      relationship,
      abstract: ref.abstract ? ref.abstract.map((a) => a.text ?? '').join(' ').trim() : undefined,
    };
  }

  // If not in references, try to parse the identifier
  if (identifier.startsWith('doc://')) {
    const parts = identifier.split('/');
    const apiName = parts[parts.length - 1] || 'Unknown';
    const pathPart = identifier.replace(/^doc:\/\/[^/]+\/documentation\//, '');

    return {
      title: apiName,
      url: `https://developer.apple.com/documentation/${pathPart}`,
      identifier,
      type: 'symbol',
      relationship,
    };
  }

  return null;
}

/**
 * Deduplicate the API list
 */
function deduplicateApis(apis: RelatedAPI[]): RelatedAPI[] {
  const seen = new Set<string>();
  return apis.filter(api => {
    if (seen.has(api.identifier)) {
      return false;
    }
    seen.add(api.identifier);
    return true;
  });
}

/**
 * Format the related-API output
 */
function formatRelatedApis(originalUrl: string, relatedApis: RelatedAPI[]): string {
  if (relatedApis.length === 0) {
    return `No related APIs found for: ${originalUrl}`;
  }

  // filter(Boolean) drops empty segments so a trailing slash doesn't yield ''.
  const apiName = new URL(originalUrl).pathname.split('/').filter(Boolean).pop() ?? 'API';
  let content = `# Related APIs for ${apiName}\n\n`;
  content += `**Source:** [${originalUrl}](${originalUrl})\n\n`;
  content += `**Found ${relatedApis.length} related APIs:**\n\n`;

  // Group by relationship type
  const groupedApis = groupApisByRelationship(relatedApis);

  for (const [relationship, apis] of Object.entries(groupedApis)) {
    content += `## ${relationship}\n\n`;

    for (const api of apis) {
      content += `### [${api.title}](${api.url})\n`;

      if (api.abstract) {
        content += `${api.abstract}\n\n`;
      }

      content += `*Type: ${api.type}*\n\n`;
    }
  }

  content += `---\n\n*Total: ${relatedApis.length} related APIs*`;

  return content;
}

/**
 * Group APIs by relationship type
 */
function groupApisByRelationship(apis: RelatedAPI[]): Record<string, RelatedAPI[]> {
  const groups: Record<string, RelatedAPI[]> = {};

  for (const api of apis) {
    if (!groups[api.relationship]) {
      groups[api.relationship] = [];
    }
    groups[api.relationship].push(api);
  }

  return groups;
}