import { z } from 'zod';
export declare const getRelatedApisSchema: z.ZodObject<{
    apiUrl: z.ZodString;
    includeInherited: z.ZodDefault<z.ZodBoolean>;
    includeConformance: z.ZodDefault<z.ZodBoolean>;
    includeSeeAlso: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
//# sourceMappingURL=related-apis.schema.d.ts.map