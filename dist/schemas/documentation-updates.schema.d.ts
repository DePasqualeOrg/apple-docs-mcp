import { z } from 'zod';
export declare const getDocumentationUpdatesSchema: z.ZodObject<{
    category: z.ZodDefault<z.ZodEnum<{
        all: "all";
        wwdc: "wwdc";
        technology: "technology";
        "release-notes": "release-notes";
    }>>;
    technology: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodString>;
    searchQuery: z.ZodOptional<z.ZodString>;
    includeBeta: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=documentation-updates.schema.d.ts.map