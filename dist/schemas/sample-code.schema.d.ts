import { z } from 'zod';
export declare const getSampleCodeSchema: z.ZodObject<{
    framework: z.ZodOptional<z.ZodString>;
    beta: z.ZodDefault<z.ZodEnum<{
        include: "include";
        exclude: "exclude";
        only: "only";
    }>>;
    searchQuery: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=sample-code.schema.d.ts.map