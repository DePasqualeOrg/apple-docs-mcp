import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const getTechnologyOverviewsSchema = z.object({
  category: z.string().optional().describe('Filter by specific category slug (e.g., "app-design-and-ui", "games", "ai-machine-learning", "data-management", "audio-and-video")'),
  searchQuery: z.string().optional().describe('Case-insensitive substring match against the broad overview titles (e.g. "App design and UI", "Graphics, drawing, and animation"). Use words that appear in those titles, like "graphics", "audio", "machine learning", or "games".'),
  includeSubcategories: z.boolean().default(true).describe('Include subcategories and nested content'),
  limit: z.number().min(1).max(API_LIMITS.MAX_TECHNOLOGY_OVERVIEWS_LIMIT).default(API_LIMITS.DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT).describe('Maximum number of results to return'),
});