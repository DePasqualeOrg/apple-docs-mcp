import { z } from 'zod';
export declare const getPlatformCompatibilitySchema: z.ZodObject<{
    apiUrl: z.ZodString;
    compareMode: z.ZodDefault<z.ZodEnum<{
        framework: "framework";
        single: "single";
    }>>;
    includeRelated: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
//# sourceMappingURL=platform-compatibility.schema.d.ts.map