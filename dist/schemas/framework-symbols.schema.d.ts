import { z } from 'zod';
export declare const searchFrameworkSymbolsSchema: z.ZodObject<{
    framework: z.ZodString;
    symbolType: z.ZodDefault<z.ZodEnum<{
        all: "all";
        method: "method";
        class: "class";
        struct: "struct";
        enum: "enum";
        protocol: "protocol";
        property: "property";
        init: "init";
        func: "func";
        var: "var";
        let: "let";
        typealias: "typealias";
    }>>;
    namePattern: z.ZodOptional<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<{
        swift: "swift";
        occ: "occ";
    }>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=framework-symbols.schema.d.ts.map