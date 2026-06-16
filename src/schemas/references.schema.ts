import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const resolveReferencesBatchSchema = z.object({
  sourceUrl: z.string().describe('The Apple Developer Documentation URL to extract and resolve references from'),
  maxReferences: z.number().min(1).max(API_LIMITS.MAX_REFERENCES_LIMIT).default(API_LIMITS.DEFAULT_REFERENCES_LIMIT).describe('Maximum number of references to resolve'),
  // Values mirror Apple's reference `role`/`kind` vocabulary. Symbol-kind values
  // (protocol/class/struct/enum) are intentionally absent: reference entries
  // don't carry a symbol kind, so filtering by them always matched nothing.
  filterByType: z.enum(['all', 'symbol', 'collection', 'article', 'sampleCode']).default('all').describe('Filter references by role: "symbol" (types, methods, properties), "collection" (grouped topics), "article", or "sampleCode". Default: "all"'),
});