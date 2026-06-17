import { z } from 'zod';
export declare const findSimilarApisSchema: z.ZodObject<{
    apiUrl: z.ZodString;
    searchDepth: z.ZodDefault<z.ZodEnum<{
        shallow: "shallow";
        medium: "medium";
        deep: "deep";
    }>>;
    filterByCategory: z.ZodOptional<z.ZodString>;
    includeAlternatives: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
//# sourceMappingURL=similar-apis.schema.d.ts.map