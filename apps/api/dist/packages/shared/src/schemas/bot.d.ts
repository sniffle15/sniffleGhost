import { z } from "zod";
export declare const BotCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    applicationId: z.ZodString;
    token: z.ZodString;
    testGuildId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    applicationId: string;
    token: string;
    description?: string | undefined;
    testGuildId?: string | undefined;
}, {
    name: string;
    applicationId: string;
    token: string;
    description?: string | undefined;
    testGuildId?: string | undefined;
}>;
export declare const BotUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    testGuildId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["stopped", "starting", "running", "error"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    status?: "error" | "stopped" | "starting" | "running" | undefined;
    testGuildId?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    status?: "error" | "stopped" | "starting" | "running" | undefined;
    testGuildId?: string | undefined;
}>;
