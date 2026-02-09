import { z } from "zod";
export declare const CommandTypeSchema: z.ZodEnum<["SLASH", "PREFIX"]>;
export declare const CommandPermissionsSchema: z.ZodObject<{
    adminOnly: z.ZodDefault<z.ZodBoolean>;
    roleAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    channelAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    adminOnly: boolean;
    roleAllowlist: string[];
    channelAllowlist: string[];
}, {
    adminOnly?: boolean | undefined;
    roleAllowlist?: string[] | undefined;
    channelAllowlist?: string[] | undefined;
}>;
export declare const CommandCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["SLASH", "PREFIX"]>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodEnum<["string", "int", "bool", "user", "channel", "role"]>>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        required: boolean;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }>, "many">>;
    permissions: z.ZodOptional<z.ZodObject<{
        adminOnly: z.ZodDefault<z.ZodBoolean>;
        roleAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        channelAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    }, {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    }>>;
    cooldownSeconds: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    type: "SLASH" | "PREFIX";
    cooldownSeconds: number;
    options?: {
        name: string;
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        required: boolean;
        description?: string | undefined;
    }[] | undefined;
    permissions?: {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    } | undefined;
}, {
    name: string;
    description: string;
    type: "SLASH" | "PREFIX";
    options?: {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }[] | undefined;
    permissions?: {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    } | undefined;
    cooldownSeconds?: number | undefined;
}>;
export declare const CommandUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["SLASH", "PREFIX"]>>;
    options: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodEnum<["string", "int", "bool", "user", "channel", "role"]>>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        required: boolean;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }>, "many">>>;
    permissions: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        adminOnly: z.ZodDefault<z.ZodBoolean>;
        roleAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        channelAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    }, {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    }>>>;
    cooldownSeconds: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    type?: "SLASH" | "PREFIX" | undefined;
    options?: {
        name: string;
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        required: boolean;
        description?: string | undefined;
    }[] | undefined;
    permissions?: {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    } | undefined;
    cooldownSeconds?: number | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    type?: "SLASH" | "PREFIX" | undefined;
    options?: {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }[] | undefined;
    permissions?: {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    } | undefined;
    cooldownSeconds?: number | undefined;
}>;
export declare const CommandVersionCreateSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
