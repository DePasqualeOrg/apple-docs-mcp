/**
 * Regression test for symbol-page topicSections being dropped.
 *
 * `get_apple_doc_content` classifies any page with a `declarations`
 * primaryContentSection as a "specific API" and used to render only the
 * declaration, discarding `topicSections`. For an enum (or option set, struct,
 * class) the members live in `topicSections`, so the tool returned the
 * declaration with NONE of the cases — making it impossible to enumerate an
 * enum or prove a case does not exist.
 *
 * The fixture is the real Apple render JSON for PHAssetCollectionSubtype
 * (documentation/photos/phassetcollectionsubtype.json). Ground truth from the
 * macOS SDK header PhotosTypes.h: 29 cases, and no `smartAlbumReceipts`.
 */

import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../src/utils/cache.js', () => ({
  apiCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
  },
  generateEnhancedCacheKey: jest.fn((url: string) => `cache-key-${url}`),
}));

jest.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    getJson: jest.fn(),
  },
}));

jest.mock('../../src/utils/url-converter.js', () => ({
  // Keep the real helpers (e.g. toAbsoluteAppleUrl) and mock only the converter.
  ...jest.requireActual('../../src/utils/url-converter.js'),
  convertToJsonApiUrl: jest.fn(),
}));

jest.mock('../../src/utils/logger.js', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { fetchAppleDocJson } from '../../src/tools/doc-fetcher.js';
import { httpClient } from '../../src/utils/http-client.js';
import { convertToJsonApiUrl } from '../../src/utils/url-converter.js';

const ENUM_CASES = [
  'albumRegular', 'albumSyncedEvent', 'albumSyncedFaces', 'albumSyncedAlbum', 'albumImported',
  'albumMyPhotoStream', 'albumCloudShared',
  'smartAlbumGeneric', 'smartAlbumPanoramas', 'smartAlbumVideos', 'smartAlbumFavorites',
  'smartAlbumTimelapses', 'smartAlbumAllHidden', 'smartAlbumRecentlyAdded', 'smartAlbumBursts',
  'smartAlbumSlomoVideos', 'smartAlbumUserLibrary', 'smartAlbumSelfPortraits', 'smartAlbumScreenshots',
  'smartAlbumDepthEffect', 'smartAlbumLivePhotos', 'smartAlbumAnimated', 'smartAlbumLongExposures',
  'smartAlbumUnableToUpload', 'smartAlbumRAW', 'smartAlbumCinematic', 'smartAlbumSpatial',
  'smartAlbumScreenRecordings', 'any',
];

describe('get_apple_doc_content renders symbol-page topicSections (enum cases)', () => {
  const webUrl = 'https://developer.apple.com/documentation/photos/phassetcollectionsubtype';
  const jsonUrl = 'https://developer.apple.com/tutorials/data/documentation/photos/phassetcollectionsubtype.json';
  const fixture = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/phassetcollectionsubtype.json'), 'utf8'),
  );

  let renderedText: string;

  beforeAll(async () => {
    (convertToJsonApiUrl as jest.Mock).mockReturnValue(jsonUrl);
    (httpClient.getJson as jest.Mock).mockResolvedValue(fixture);

    const result = await fetchAppleDocJson(webUrl);
    renderedText = result.content[0].text;
  });

  it('renders the enum declaration', () => {
    expect(renderedText).toContain('## Declaration');
    expect(renderedText).toContain('PHAssetCollectionSubtype');
  });

  it('renders a Topics section (previously dropped for symbol pages)', () => {
    expect(renderedText).toContain('## Topics');
  });

  it('lists all 29 enum cases', () => {
    for (const enumCase of ENUM_CASES) {
      expect(renderedText).toContain(`PHAssetCollectionSubtype.${enumCase}`);
    }
    expect(ENUM_CASES).toHaveLength(29);
  });

  it('does not invent a smartAlbumReceipts case', () => {
    expect(renderedText).not.toContain('smartAlbumReceipts');
  });

  it('builds correct (non-SwiftUI) documentation links for cases', () => {
    // The old formatter hard-coded doc://com.apple.SwiftUI/, producing broken
    // links for every other framework. Links must point at the photos paths.
    expect(renderedText).toContain('https://developer.apple.com/documentation/photos/phassetcollectionsubtype/albumregular');
    expect(renderedText).not.toContain('documentation/doc://');
  });
});
