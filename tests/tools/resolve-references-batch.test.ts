import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleResolveReferencesBatch } from '../../src/tools/resolve-references-batch.js';
import { httpClient } from '../../src/utils/http-client.js';
import { convertToJsonApiUrl } from '../../src/utils/url-converter.js';

jest.mock('../../src/utils/http-client.js');
jest.mock('../../src/utils/url-converter.js', () => ({
  // Keep the real helpers (e.g. toAbsoluteAppleUrl) and mock only the converter.
  ...jest.requireActual('../../src/utils/url-converter.js'),
  convertToJsonApiUrl: jest.fn(),
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;
const mockConvert = convertToJsonApiUrl as jest.MockedFunction<typeof convertToJsonApiUrl>;

function makeRefs(n: number): Record<string, unknown> {
  const refs: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) {
    refs[`doc://x/documentation/foo/sym${i}`] = {
      title: `Sym${i}`,
      url: `/documentation/foo/sym${i}`,
      role: 'symbol',
      kind: 'symbol',
    };
  }
  return refs;
}

describe('handleResolveReferencesBatch', () => {
  const sourceUrl = 'https://developer.apple.com/documentation/foo/bar';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConvert.mockReturnValue(
      'https://developer.apple.com/tutorials/data/documentation/foo/bar.json',
    );
  });

  it('resolves and groups references by role', async () => {
    mockHttpClient.getJson.mockResolvedValue({
      references: makeRefs(3),
      metadata: { title: 'Bar' },
    } as never);

    const out = await handleResolveReferencesBatch(sourceUrl, 20, 'all');
    expect(out).toContain('References from Bar');
    expect(out).toContain('Sym0');
    expect(out).toContain('API Symbols'); // role 'symbol' renders as the "API Symbols" group
  });

  it('notes truncation when more references exist than maxReferences', async () => {
    mockHttpClient.getJson.mockResolvedValue({
      references: makeRefs(10),
      metadata: { title: 'Bar' },
    } as never);

    const out = await handleResolveReferencesBatch(sourceUrl, 3, 'all');
    expect(out).toContain('Showing 3 of 10');
    expect(out).toContain('maxReferences');
  });

  it('filterByType "collection" matches the collectionGroup role too', async () => {
    // Apple labels grouped topics with role 'collectionGroup'; the friendlier
    // "collection" filter must catch those (otherwise the filter looks broken).
    mockHttpClient.getJson.mockResolvedValue({
      references: {
        'doc://x/documentation/foo/group': {
          title: 'Essentials',
          url: '/documentation/foo/group',
          role: 'collectionGroup',
          kind: 'symbol',
        },
        'doc://x/documentation/foo/sym0': {
          title: 'Sym0',
          url: '/documentation/foo/sym0',
          role: 'symbol',
          kind: 'symbol',
        },
      },
      metadata: { title: 'Bar' },
    } as never);

    const out = await handleResolveReferencesBatch(sourceUrl, 20, 'collection');
    expect(out).toContain('Essentials');
    expect(out).not.toContain('Sym0');
  });

  it('reports when no references are found', async () => {
    mockHttpClient.getJson.mockResolvedValue({ references: {}, metadata: { title: 'Bar' } } as never);
    const out = await handleResolveReferencesBatch(sourceUrl);
    expect(out).toContain('No references found');
  });

  it('handles an invalid URL', async () => {
    mockConvert.mockReturnValue(null);
    const out = await handleResolveReferencesBatch(sourceUrl);
    expect(out).toContain('Error');
  });
});
