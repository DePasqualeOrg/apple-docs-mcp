import { convertToJsonApiUrl, toAbsoluteAppleUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-handler.js';

/**
 * Resolved reference info
 */
interface ResolvedReference {
  identifier: string;
  title: string;
  url: string;
  type: string;
  role: string;
  abstract?: string;
  kind?: string;
  symbolKind?: string;
  platforms?: Array<{
    name: string;
    introducedAt?: string;
    beta?: boolean;
    deprecated?: boolean;
  }>;
  fragments?: Array<{
    kind: string;
    text: string;
  }>;
}

interface ReferenceData {
  title: string;
  url?: string;
  type?: string;
  role?: string;
  kind?: string;
  abstract?: Array<{ text?: string }>;
  fragments?: Array<{ kind?: string; text?: string }>;
  platforms?: Array<{ name?: string; introducedAt?: string; beta?: boolean; deprecated?: boolean }>;
  symbolKind?: string;
  navigatorTitle?: Array<{ text?: string }>;
}

interface AppleDocData {
  references?: Record<string, ReferenceData>;
  metadata?: {
    title?: string;
  };
}

/**
 * Resolve references in batch
 */
export async function handleResolveReferencesBatch(
  sourceUrl: string,
  maxReferences: number = 20,
  filterByType: string = 'all',
): Promise<string> {
  try {
    logger.info(`Resolving references from: ${sourceUrl}`);

    // Convert the web URL to a JSON API URL
    const jsonApiUrl = convertToJsonApiUrl(sourceUrl);

    if (!jsonApiUrl) {
      throw new Error('Invalid Apple Developer Documentation URL');
    }

    const data = await httpClient.getJson<AppleDocData>(jsonApiUrl);

    if (!data.references || Object.keys(data.references).length === 0) {
      return `No references found in: ${sourceUrl}`;
    }

    // Filter and limit the number of references
    const filteredReferences = filterReferences(data.references, filterByType);
    const filteredEntries = Object.entries(filteredReferences);
    const limitedReferences = filteredEntries.slice(0, maxReferences);

    // Resolve the reference info
    const resolvedReferences: ResolvedReference[] = [];

    for (const [identifier, refData] of limitedReferences) {
      const resolved = await resolveReference(identifier, refData);
      if (resolved) {
        resolvedReferences.push(resolved);
      }
    }

    // Format the output
    return formatResolvedReferences(
      sourceUrl,
      resolvedReferences,
      data.metadata?.title,
      filteredEntries.length,
    );

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return `Error: Failed to resolve references: ${errorMessage}`;
  }
}



/**
 * Filter references
 */
function filterReferences(
  references: Record<string, ReferenceData>,
  filterByType: string,
): Record<string, ReferenceData> {
  if (filterByType === 'all') {
    return references;
  }

  const filtered: Record<string, ReferenceData> = {};

  for (const [identifier, refData] of Object.entries(references)) {
    const matchesFilter =
      refData.role === filterByType ||
      refData.kind === filterByType ||
      refData.type === filterByType ||
      refData.symbolKind === filterByType ||
      // Apple groups topic collections under the `collectionGroup` role; treat
      // the friendlier "collection" filter as matching both.
      (filterByType === 'collection' && refData.role === 'collectionGroup');

    if (matchesFilter) {
      filtered[identifier] = refData;
    }
  }

  return filtered;
}

/**
 * Resolve a single reference
 */
async function resolveReference(
  identifier: string,
  refData: ReferenceData,
): Promise<ResolvedReference | null> {
  try {
    // Basic info
    const resolved: ResolvedReference = {
      identifier,
      title: refData.title || 'Unknown',
      url: toAbsoluteAppleUrl(refData.url),
      type: refData.type ?? 'unknown',
      role: refData.role ?? 'unknown',
      kind: refData.kind,
      symbolKind: refData.symbolKind,
    };

    // Process the abstract
    if (refData.abstract && Array.isArray(refData.abstract)) {
      resolved.abstract = refData.abstract
        .map(item => item.text ?? '')
        .join(' ')
        .trim();
    }

    // Process code fragments
    if (refData.fragments && Array.isArray(refData.fragments)) {
      resolved.fragments = refData.fragments.map(fragment => ({
        kind: fragment.kind ?? 'text',
        text: fragment.text ?? '',
      }));
    }

    // Process platform info
    if (refData.platforms && Array.isArray(refData.platforms)) {
      resolved.platforms = refData.platforms.map(platform => ({
        name: platform.name ?? 'Unknown',
        introducedAt: platform.introducedAt,
        beta: platform.beta ?? false,
        deprecated: platform.deprecated ?? false,
      }));
    }

    return resolved;

  } catch (error) {
    logger.error(`Failed to resolve reference ${identifier}:`, error);
    return null;
  }
}

/**
 * Format the resolved results
 */
function formatResolvedReferences(
  sourceUrl: string,
  references: ResolvedReference[],
  sourceTitle?: string,
  totalAvailable?: number,
): string {
  if (references.length === 0) {
    return `No references could be resolved from: ${sourceUrl}`;
  }

  // filter(Boolean) drops empty path segments so a trailing slash doesn't make
  // pop() return '' (which ?? would keep); the chain is then safely nullish.
  const title = sourceTitle ?? new URL(sourceUrl).pathname.split('/').filter(Boolean).pop() ?? 'Document';
  let content = `# References from ${title}\n\n`;
  content += `**Source:** [${sourceUrl}](${sourceUrl})\n\n`;
  content += `**Resolved ${references.length} references:**\n\n`;

  // Make truncation explicit so a partial listing is never mistaken for a
  // complete one (e.g. enumerating an enum's cases).
  if (typeof totalAvailable === 'number' && totalAvailable > references.length) {
    content += `> Showing ${references.length} of ${totalAvailable} matching references. Raise \`maxReferences\` (max 200) to see more.\n\n`;
  }

  // Group by type
  const groupedReferences = groupReferencesByRole(references);

  for (const [role, refs] of Object.entries(groupedReferences)) {
    content += `## ${formatRoleTitle(role)} (${refs.length})\n\n`;

    for (const ref of refs) {
      content += formatSingleReference(ref);
    }
  }

  content += `---\n\n*Total: ${references.length} references resolved*`;

  return content;
}

/**
 * Group references by role
 */
function groupReferencesByRole(references: ResolvedReference[]): Record<string, ResolvedReference[]> {
  const groups: Record<string, ResolvedReference[]> = {};

  for (const ref of references) {
    const role = ref.role || 'unknown';
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(ref);
  }

  return groups;
}

/**
 * Format the role title
 */
function formatRoleTitle(role: string): string {
  const roleTitles: Record<string, string> = {
    'symbol': 'API Symbols',
    'collection': 'Collections',
    'article': 'Articles',
    'sampleCode': 'Sample Code',
    'overview': 'Overviews',
    'collectionGroup': 'Collection Groups',
    'unknown': 'Other References',
  };

  return roleTitles[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Format a single reference
 */
function formatSingleReference(ref: ResolvedReference): string {
  let content = `### [${ref.title}](${ref.url})\n`;

  // Add code fragment (if it's a symbol)
  if (ref.fragments && ref.fragments.length > 0) {
    const codeSignature = ref.fragments.map(f => f.text).join('');
    if (codeSignature.trim()) {
      content += `\`\`\`swift\n${codeSignature}\`\`\`\n\n`;
    }
  }

  // Add the abstract
  if (ref.abstract) {
    content += `${ref.abstract}\n\n`;
  }

  // Add metadata
  const metadata = [];
  if (ref.kind) {
    metadata.push(`Kind: ${ref.kind}`);
  }
  if (ref.symbolKind) {
    metadata.push(`Symbol: ${ref.symbolKind}`);
  }
  if (metadata.length > 0) {
    content += `*${metadata.join(' | ')}*\n\n`;
  }

  // Add platform info
  if (ref.platforms && ref.platforms.length > 0) {
    const platformInfo = ref.platforms.map(p => {
      let info = p.name;
      if (p.introducedAt) {
        info += ` ${p.introducedAt}+`;
      }
      if (p.beta) {
        info += ' (Beta)';
      }
      if (p.deprecated) {
        info += ' (Deprecated)';
      }
      return info;
    }).join(', ');
    content += `**Platforms:** ${platformInfo}\n\n`;
  }

  return content;
}