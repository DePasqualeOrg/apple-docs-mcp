import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapSearchResults, type AppleSearchResponse } from '../../src/tools/search-result-parser.js';
import { formatSearchResults, fetchAppleDocsSearch } from '../../src/tools/search-parser.js';
import { httpClient } from '../../src/utils/http-client.js';

// Real Apple search API response (query "swiftui animations"): 34 documentation
// entries + 44 developer entries. Used to verify mapping, filtering, and dedup.
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/apple-search.json'), 'utf8'),
) as AppleSearchResponse;

const KNOWN_TYPES = ['documentation', 'documentation-article', 'sample-code'];

describe('mapSearchResults', () => {
  it('maps documentation entries and drops the developer category', () => {
    const results = mapSearchResults(fixture, 'all');
    expect(results.length).toBeGreaterThan(0);
    // The fixture has 44 `developer` entries (parallel-array shape, no
    // `documentation.metadata`); none should appear.
    expect(results.every((r) => KNOWN_TYPES.includes(r.type))).toBe(true);
    const first = results[0];
    expect(first.title).toBeTruthy();
    expect(first.url).toMatch(/^https:\/\/developer\.apple\.com\/documentation\//);
  });

  it('the sample filter returns sample-code results (and only those)', () => {
    // Regression: the fixture has `sampleCode` and `project` kinds. The `sample`
    // filter previously returned zero because no kind mapped to `sample-code`.
    const samples = mapSearchResults(fixture, 'sample');
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((r) => r.type === 'sample-code')).toBe(true);
  });

  it('the documentation filter excludes samples', () => {
    const docs = mapSearchResults(fixture, 'documentation');
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((r) => r.type !== 'sample-code')).toBe(true);
  });

  it('the all filter includes both documentation and samples', () => {
    const all = mapSearchResults(fixture, 'all');
    expect(all.some((r) => r.type === 'sample-code')).toBe(true);
    expect(all.some((r) => r.type.startsWith('documentation'))).toBe(true);
  });

  it('extracts the framework from the hierarchy', () => {
    const results = mapSearchResults(fixture, 'all');
    const animations = results.find((r) => r.url.endsWith('/swiftui/animations'));
    expect(animations?.framework).toBe('SwiftUI');
  });

  it('de-duplicates by URL', () => {
    const results = mapSearchResults(fixture, 'all');
    const urls = results.map((r) => r.url.toLowerCase());
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('returns nothing for an empty response', () => {
    expect(mapSearchResults({ results: [] }, 'all')).toEqual([]);
    expect(mapSearchResults({}, 'all')).toEqual([]);
  });
});

describe('formatSearchResults', () => {
  it('renders a header, query, and result entries', () => {
    const results = mapSearchResults(fixture, 'all');
    const text = formatSearchResults(results, 'swiftui animations', 'all', 'https://developer.apple.com/search/?q=x');
    expect(text).toContain('# Apple Documentation Search Results');
    expect(text).toContain('**Query:** "swiftui animations"');
    expect(text).toContain('### 1.');
  });

  it('shows a no-results message that routes to the JSON-API tools', () => {
    const text = formatSearchResults([], 'zzznotathing', 'all', 'https://developer.apple.com/search/?q=x');
    expect(text).toContain('No results found for "zzznotathing"');
    expect(text).toContain('### Suggestions:');
    expect(text).toContain('get_apple_doc_content');
  });
});

describe('fetchAppleDocsSearch', () => {
  afterEach(() => jest.restoreAllMocks());

  it('calls the search API and formats the results', async () => {
    const spy = jest.spyOn(httpClient, 'postJson').mockResolvedValue(fixture);
    const res = await fetchAppleDocsSearch('swiftui animations', 'all');
    expect(spy).toHaveBeenCalledWith(
      'https://devintserv.msc.sbz.apple.com/api/v1/search',
      { text: 'swiftui animations', targetResultLocale: 'en' },
    );
    expect(res.content[0].text).toContain('# Apple Documentation Search Results');
  });

  it('degrades gracefully when the search API fails', async () => {
    jest.spyOn(httpClient, 'postJson').mockRejectedValue(new Error('endpoint moved'));
    const res = await fetchAppleDocsSearch('swiftui', 'all');
    expect(res.content[0].text).toContain('Search is temporarily unavailable');
    expect(res.content[0].text).toContain('get_apple_doc_content');
  });
});
