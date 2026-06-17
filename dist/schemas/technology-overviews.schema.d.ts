import { z } from 'zod';
export declare const getTechnologyOverviewsSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    searchQuery: z.ZodOptional<z.ZodString>;
    includeSubcategories: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=technology-overviews.schema.d.ts.map