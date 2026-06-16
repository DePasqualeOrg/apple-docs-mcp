import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const listTechnologiesSchema = z.object({
  category: z.string().optional().describe('Filter by technology category, matched against group names like "App Frameworks", "Graphics & Games", "App Services". Hyphen/slug forms also work (e.g. "graphics-and-games").'),
  language: z.enum(['swift', 'occ']).optional().describe('Filter by programming language'),
  includeBeta: z.boolean().default(true).describe('Include beta technologies'),
  limit: z.number().int().positive().max(API_LIMITS.MAX_TECHNOLOGIES_LIMIT).default(API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT).describe('Maximum number of technologies to return'),
});