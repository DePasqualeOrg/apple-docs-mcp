import { z } from 'zod';
export declare const searchAppleDocsSchema: z.ZodObject<{
    query: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        all: "all";
        documentation: "documentation";
        sample: "sample";
    }>>;
}, z.core.$strip>;
//# sourceMappingURL=search.schema.d.ts.map