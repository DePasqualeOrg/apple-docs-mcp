/**
 * Search result types and mapping from Apple's developer search API.
 *
 * Apple's search page (developer.apple.com/search) is client-rendered and calls
 * a JSON API; this maps that API's response into the flat SearchResult shape the
 * formatter consumes. Only `documentation` entries are surfaced — the API also
 * returns a `developer` category (videos, news, sessions) in a parallel-array
 * shape that this documentation tool does not present.
 */
/**
 * Type filter mapping for the tool's `type` argument. The JSON API returns
 * documentation pages (symbols and articles) and sample code; `all` surfaces
 * both, `documentation` restricts to reference pages, and `sample` to samples.
 */
export const typeMapping = {
    all: ['documentation', 'documentation-article', 'sample-code'],
    documentation: ['documentation', 'documentation-article'],
    sample: ['sample-code'],
};
function resultTypeForKind(kind) {
    if (kind === 'article') {
        return 'documentation-article';
    }
    // Apple tags downloadable samples as `sampleCode` and Xcode starter projects
    // as `project`; both map to the tool's `sample` filter.
    if (kind === 'sampleCode' || kind === 'project') {
        return 'sample-code';
    }
    return 'documentation';
}
function frameworkFromHierarchy(hierarchy) {
    if (!hierarchy) {
        return undefined;
    }
    const first = hierarchy.split('>')[0]?.trim();
    return first || undefined;
}
/**
 * Map the search API response into SearchResult[], applying the type filter and
 * de-duplicating by URL. Featured results are listed first.
 */
export function mapSearchResults(data, filterType = 'all') {
    const entries = [...(data.featuredResults ?? []), ...(data.results ?? [])];
    const allowed = typeMapping[filterType] ?? typeMapping.all;
    const seen = new Set();
    const results = [];
    for (const entry of entries) {
        const md = entry.documentation?.metadata;
        if (!md?.title || !md.permalink) {
            continue;
        }
        const type = resultTypeForKind(md.kind);
        if (!allowed.includes(type)) {
            continue;
        }
        const key = md.permalink.replace(/\/$/, '').toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        results.push({
            title: md.title,
            url: md.permalink,
            type,
            description: md.description?.trim() ?? '',
            framework: frameworkFromHierarchy(md.hierarchy),
            beta: /beta/i.test(md.availability ?? ''),
        });
    }
    return results;
}
//# sourceMappingURL=search-result-parser.js.map