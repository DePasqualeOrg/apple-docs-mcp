/**
 * WWDC Data Source - Loads data from bundled JSON files
 *
 * This module provides functions to load WWDC video data from
 * JSON files that are bundled with the npm package.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { getErrorMessage } from './error-handler.js';
import { wwdcDataCache } from './cache.js';
import { WWDC_CONFIG } from './constants.js';
import { getWWDCDataDirectory } from './wwdc-data-source-path.js';
import type { WWDCVideo, GlobalMetadata, TopicIndex, YearIndex } from '../types/wwdc.js';

// Get the data directory from the separate module
const WWDC_DATA_DIR = getWWDCDataDirectory();

/**
 * Read file from bundled data directory
 */
async function readBundledFile(filePath: string): Promise<string> {
  const fullPath = path.join(WWDC_DATA_DIR, filePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    logger.debug(`Loaded bundled data: ${filePath}`);
    return content;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(`Failed to read bundled data: ${filePath}`, error);
    throw new Error(`Failed to load WWDC data from ${filePath}: ${errorMessage}`, { cause: error });
  }
}

/**
 * Fetch and parse a bundled JSON file, caching the parsed object. Caching the
 * parsed result (rather than the raw text) avoids re-parsing up to ~400 KB on
 * every cache hit.
 */
async function fetchJson<T>(filePath: string): Promise<T> {
  const cacheKey = `wwdc:${filePath}`;

  // Check cache first
  const cached = wwdcDataCache.get<T>(cacheKey);
  if (cached !== undefined && cached !== null) {
    logger.debug(`Cache hit: ${filePath}`);
    return cached;
  }

  // Read and parse the bundled data
  const raw = await readBundledFile(filePath);
  const parsed = JSON.parse(raw) as T;

  // Cache the parsed object
  wwdcDataCache.set(cacheKey, parsed, WWDC_CONFIG.CACHE_TTL);

  return parsed;
}

/**
 * Load global metadata (index.json)
 */
export async function loadGlobalMetadata(): Promise<GlobalMetadata> {
  try {
    return await fetchJson<GlobalMetadata>('index.json');
  } catch (error) {
    logger.error('Failed to load global metadata', error);
    throw new Error('Failed to load WWDC metadata. Please ensure the package is properly installed.', { cause: error });
  }
}

/**
 * Load topic index
 */
export async function loadTopicIndex(topicId: string): Promise<TopicIndex> {
  try {
    return await fetchJson<TopicIndex>(`by-topic/${topicId}/index.json`);
  } catch (error) {
    logger.error(`Failed to load topic index: ${topicId}`, error);
    throw new Error(`Topic not found: ${topicId}`, { cause: error });
  }
}

/**
 * Load year index
 */
export async function loadYearIndex(year: string): Promise<YearIndex> {
  try {
    return await fetchJson<YearIndex>(`by-year/${year}/index.json`);
  } catch (error) {
    logger.error(`Failed to load year index: ${year}`, error);
    throw new Error(`Year not found: ${year}`, { cause: error });
  }
}

/**
 * Load individual video data
 */
export async function loadVideoData(year: string, videoId: string): Promise<WWDCVideo> {
  try {
    return await fetchJson<WWDCVideo>(`videos/${year}-${videoId}.json`);
  } catch (error) {
    logger.error(`Failed to load video: ${year}-${videoId}`, error);
    throw new Error(`Video not found: ${year}-${videoId}`, { cause: error });
  }
}
