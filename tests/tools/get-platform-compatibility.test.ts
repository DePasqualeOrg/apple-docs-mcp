import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleGetPlatformCompatibility } from '../../src/tools/get-platform-compatibility.js';
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

describe('handleGetPlatformCompatibility', () => {
  const apiUrl = 'https://developer.apple.com/documentation/swiftui/view';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConvert.mockReturnValue(
      'https://developer.apple.com/tutorials/data/documentation/swiftui/view.json',
    );
  });

  it('formats platform availability from the doc metadata', async () => {
    mockHttpClient.getJson.mockResolvedValue({
      metadata: {
        title: 'View',
        platforms: [
          { name: 'iOS', introducedAt: '13.0' },
          { name: 'macOS', introducedAt: '10.15', deprecated: true, deprecatedAt: '14.0' },
          { name: 'visionOS', introducedAt: '1.0', beta: true },
        ],
      },
    } as never);

    const out = await handleGetPlatformCompatibility(apiUrl);
    expect(out).toContain('View');
    expect(out).toContain('iOS');
    expect(out).toContain('13.0');
    expect(out).toContain('macOS');
    expect(out).toContain('visionOS');
  });

  it('reports when no platform information is available', async () => {
    mockHttpClient.getJson.mockResolvedValue({ metadata: {} } as never);
    const out = await handleGetPlatformCompatibility(apiUrl);
    expect(out).toContain('No platform information available');
  });

  it('surfaces an invalid-URL error', async () => {
    mockConvert.mockReturnValue(null);
    const out = await handleGetPlatformCompatibility(apiUrl);
    expect(out).toContain('Error');
  });
});
