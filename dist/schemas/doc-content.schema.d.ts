import { z } from 'zod';
export declare const getAppleDocContentSchema: z.ZodObject<{
    url: z.ZodString;
    includeRelatedApis: z.ZodDefault<z.ZodBoolean>;
    includeReferences: z.ZodDefault<z.ZodBoolean>;
    includeSimilarApis: z.ZodDefault<z.ZodBoolean>;
    includePlatformAnalysis: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
//# sourceMappingURL=doc-content.schema.d.ts.map