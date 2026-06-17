import { indexCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS, API_LIMITS, PROCESSING_LIMITS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/error-handler.js';
import { normalizeFrameworkName } from '../utils/framework-mapper.js';
/**
 * MCP Tool Definition
 */
export const searchFrameworkSymbolsTool = {
    name: 'search_framework_symbols',
    description: 'Browse and search symbols within a specific Apple framework. Perfect for exploring framework APIs, finding all views/controllers/delegates in a framework, or discovering available types. Use after list_technologies to get framework identifiers.',
    inputSchema: {
        type: 'object',
        properties: {
            framework: {
                type: 'string',
                description: 'Framework identifier in lowercase. Common: "uikit", "swiftui", "foundation", "combine", "coredata". Get exact names from list_technologies. Example: "swiftui" for SwiftUI framework.',
            },
            symbolType: {
                type: 'string',
                enum: ['all', 'class', 'struct', 'enum', 'protocol', 'method', 'property', 'init', 'func', 'var', 'let', 'typealias'],
                description: 'Filter by symbol type. Use "class" for UIViewController subclasses, "protocol" for delegates, "struct" for value types. Default: "all" shows everything.',
            },
            namePattern: {
                type: 'string',
                description: 'Filter by name pattern. Use "*View" for all views, "UI*" for UI-prefixed symbols, "*Delegate" for delegates. Case-sensitive. Leave empty for all symbols.',
            },
            language: {
                type: 'string',
                enum: ['swift', 'occ'],
                description: 'Language preference. Some APIs differ between Swift and Objective-C. Default: "swift"',
            },
            limit: {
                type: 'number',
                description: `Results limit (default: ${API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT}, max: ${API_LIMITS.MAX_FRAMEWORK_SYMBOLS_LIMIT}). Includes nested symbols.`,
                minimum: 1,
                maximum: API_LIMITS.MAX_FRAMEWORK_SYMBOLS_LIMIT,
            },
        },
        required: ['framework'],
    },
    annotations: {
        title: 'Search Framework Symbols',
        readOnlyHint: true,
    },
};
/**
 * Search a framework's symbols (classes, structs, protocols, etc.)
 */
// Function to find symbols recursively (defined outside to reduce complexity)
function findSymbolsRecursive(items, symbolType, namePattern, limit, symbols, depth = 0) {
    if (depth > 6) {
        return false;
    }
    for (const item of items) {
        if (symbols.length >= limit) {
            return true; // Limit reached
        }
        // Check if symbol type matches
        if (symbolType === 'all' || item.type === symbolType) {
            // Check name pattern if provided
            if (!namePattern || matchesPattern(item.title, namePattern)) {
                symbols.push(item);
            }
        }
        if (item.children && symbols.length < limit) {
            const limitReached = findSymbolsRecursive(item.children, symbolType, namePattern, limit, symbols, depth + 1);
            if (limitReached) {
                return true;
            }
        }
    }
    return false;
}
export async function searchFrameworkSymbols(framework, symbolType = 'all', namePattern, language = 'swift', limit = API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT) {
    try {
        // Normalize framework name for consistent processing
        const normalizedFramework = normalizeFrameworkName(framework);
        logger.info(`Searching ${symbolType} symbols in ${normalizedFramework} framework`);
        // Fetch the framework index
        const indexUrl = `${APPLE_URLS.TUTORIALS_DATA}index/${framework.toLowerCase()}`;
        const cacheKey = generateUrlCacheKey(indexUrl, { framework: normalizedFramework, symbolType, namePattern, language, limit });
        // Check cache
        const cachedResult = indexCache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }
        const data = await httpClient.getJson(indexUrl);
        // Get language-specific index
        const indexItems = data.interfaceLanguages?.[language] || [];
        if (indexItems.length === 0) {
            const availableLanguages = Object.keys(data.interfaceLanguages || {});
            return `Language "${language}" not available for ${framework}. Available languages: ${availableLanguages.join(', ')}`;
        }
        // Find all symbols recursively
        const symbols = [];
        findSymbolsRecursive(indexItems, symbolType, namePattern, limit, symbols);
        // Format results
        const typeLabel = symbolType === 'all' ? 'Symbols' : pluralizeType(symbolType);
        let result = `# ${framework} Framework ${typeLabel}\n\n`;
        if (symbols.length === 0) {
            const typeText = symbolType === 'all' ? 'symbols' : pluralizeType(symbolType).toLowerCase();
            result += `No ${typeText} found`;
            if (namePattern) {
                result += ` matching pattern "${namePattern}"`;
            }
            result += ` in ${framework} framework.\n`;
            // Suggest exploring collections
            const collections = findCollections(indexItems);
            if (collections.length > 0) {
                result += '\n## Try exploring these collections:\n\n';
                for (const col of collections.slice(0, PROCESSING_LIMITS.MAX_COLLECTIONS_TO_SHOW)) {
                    result += `- [${col.title}](https://developer.apple.com${col.path})\n`;
                }
            }
        }
        else {
            result += `**Found:** ${symbols.length} ${symbolType === 'all' ? 'symbols' : pluralizeType(symbolType).toLowerCase()}`;
            if (namePattern) {
                result += ` matching "${namePattern}"`;
            }
            result += '\n\n';
            // Group by type if searching all
            if (symbolType === 'all') {
                const grouped = groupByType(symbols);
                for (const [type, items] of Object.entries(grouped)) {
                    result += `## ${pluralizeType(type)} (${items.length})\n\n`;
                    for (const item of items) {
                        result += formatSymbolItem(item);
                    }
                    result += '\n';
                }
            }
            else {
                // List symbols
                for (const symbol of symbols) {
                    result += formatSymbolItem(symbol);
                }
            }
        }
        // Cache result
        indexCache.set(cacheKey, result);
        return result;
    }
    catch (error) {
        return `Error searching classes: ${getErrorMessage(error)}`;
    }
}
function formatSymbolItem(item) {
    const url = `https://developer.apple.com${item.path}`;
    let result = `- [**${item.title}**](${url})`;
    const metadata = [];
    if (item.beta) {
        metadata.push('Beta');
    }
    if (item.deprecated) {
        metadata.push('Deprecated');
    }
    if (item.type && item.type !== 'groupMarker') {
        metadata.push(formatTypeLabel(item.type));
    }
    if (metadata.length > 0) {
        result += ` *(${metadata.join(', ')})*`;
    }
    return result + '\n';
}
function groupByType(symbols) {
    const groups = {};
    for (const symbol of symbols) {
        if (!groups[symbol.type]) {
            groups[symbol.type] = [];
        }
        groups[symbol.type].push(symbol);
    }
    return groups;
}
function formatTypeLabel(type) {
    const typeLabels = {
        'symbol': 'Symbol',
        'module': 'Module',
        'class': 'Class',
        'struct': 'Struct',
        'enum': 'Enum',
        'protocol': 'Protocol',
        'method': 'Method',
        'property': 'Property',
        'init': 'Initializer',
        'case': 'Case',
        'associatedtype': 'Associated Type',
        'typealias': 'Type Alias',
        'article': 'Article',
        'sampleCode': 'Sample Code',
        'overview': 'Overview',
        'collection': 'Collection',
        'func': 'Function',
        'var': 'Variable',
        'let': 'Constant',
        'operator': 'Operator',
        'macro': 'Macro',
        'namespace': 'Namespace',
    };
    return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
function pluralizeType(type) {
    const typeLabel = formatTypeLabel(type);
    // Special cases for pluralization
    const pluralRules = {
        'Class': 'Classes',
        'Property': 'Properties',
        'Associated Type': 'Associated Types',
        'Type Alias': 'Type Aliases',
        'Sample Code': 'Sample Code',
    };
    return pluralRules[typeLabel] || typeLabel + 's';
}
function matchesPattern(name, pattern) {
    const regexPattern = pattern
        .split('*')
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(name);
}
function findCollections(items) {
    const collections = [];
    function search(itemList) {
        for (const item of itemList) {
            if (item.type === 'collection') {
                collections.push(item);
            }
            if (item.children) {
                search(item.children);
            }
        }
    }
    search(items);
    return collections;
}
//# sourceMappingURL=search-framework-symbols.js.map