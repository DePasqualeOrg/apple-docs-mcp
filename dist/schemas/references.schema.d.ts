import { z } from 'zod';
export declare const resolveReferencesBatchSchema: z.ZodObject<{
    sourceUrl: z.ZodString;
    maxReferences: z.ZodDefault<z.ZodNumber>;
    filterByType: z.ZodDefault<z.ZodEnum<{
        symbol: "symbol";
        all: "all";
        article: "article";
        sampleCode: "sampleCode";
        collection: "collection";
    }>>;
}, z.core.$strip>;
//# sourceMappingURL=references.schema.d.ts.map