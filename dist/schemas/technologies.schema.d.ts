import { z } from 'zod';
export declare const listTechnologiesSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodEnum<{
        swift: "swift";
        occ: "occ";
    }>>;
    includeBeta: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=technologies.schema.d.ts.map