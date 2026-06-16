/**
 * Tests for the WWDC data source. These exercise the real loaders by mocking
 * only the filesystem read boundary, so JSON parsing, caching, and error
 * wrapping are actually verified. (The previous version mocked the module under
 * test and only checked that jest returned what it was told — testing nothing.)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs') as typeof import('fs');
  return {
    ...actual,
    promises: { ...actual.promises, readFile: jest.fn() },
  };
});

import { promises as fs } from 'fs';
import {
  loadGlobalMetadata,
  loadTopicIndex,
  loadYearIndex,
  loadVideoData,
} from '../../src/utils/wwdc-data-source.js';
import { wwdcDataCache } from '../../src/utils/cache.js';

const readFile = fs.readFile as unknown as jest.Mock;

const metadata = {
  version: '1.0',
  lastUpdated: '2025-07-18T00:00:00Z',
  totalVideos: 5,
  topics: [],
  years: ['2024'],
  statistics: {
    byTopic: {},
    byYear: {},
    videosWithCode: 1,
    videosWithTranscript: 2,
    videosWithResources: 0,
  },
};

describe('WWDC data source (real loaders, mocked fs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wwdcDataCache.clear();
  });

  it('parses index.json into GlobalMetadata', async () => {
    readFile.mockResolvedValue(JSON.stringify(metadata));
    const result = await loadGlobalMetadata();
    expect(result.totalVideos).toBe(5);
    expect(result.years).toEqual(['2024']);
    expect(result.lastUpdated).toBe('2025-07-18T00:00:00Z');
  });

  it('caches the parsed result (second load does not re-read the file)', async () => {
    readFile.mockResolvedValue(JSON.stringify(metadata));
    await loadGlobalMetadata();
    await loadGlobalMetadata();
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it('parses a year index with its video entries', async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        year: '2024',
        videoCount: 1,
        topics: [],
        videos: [
          {
            id: '10001',
            year: '2024',
            title: 'A Session',
            topics: [],
            duration: '15:00',
            hasCode: true,
            hasTranscript: true,
            url: 'u',
            dataFile: 'videos/2024-10001.json',
          },
        ],
      }),
    );
    const idx = await loadYearIndex('2024');
    expect(idx.year).toBe('2024');
    expect(idx.videos[0].dataFile).toBe('videos/2024-10001.json');
  });

  it('parses individual video data', async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        id: '10001',
        year: '2024',
        url: 'u',
        title: 'A Session',
        duration: '15:00',
        topics: [],
        hasTranscript: false,
        hasCode: false,
      }),
    );
    const video = await loadVideoData('2024', '10001');
    expect(video.id).toBe('10001');
  });

  it('throws a friendly error when a file is missing', async () => {
    readFile.mockRejectedValue(new Error('ENOENT: no such file'));
    await expect(loadTopicIndex('nope')).rejects.toThrow('Topic not found');
    await expect(loadYearIndex('1999')).rejects.toThrow('Year not found');
  });
});
