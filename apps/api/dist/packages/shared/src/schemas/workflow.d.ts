import { z } from "zod";
export declare const WorkflowGraphSchema: z.ZodObject<{
    version: z.ZodNumber;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, any>;
        id: string;
        type: string;
        position: {
            x: number;
            y: number;
        };
    }, {
        data: Record<string, any>;
        id: string;
        type: string;
        position: {
            x: number;
            y: number;
        };
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodString;
        target: z.ZodString;
        sourceHandle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        targetHandle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        source: string;
        target: string;
        sourceHandle?: string | null | undefined;
        targetHandle?: string | null | undefined;
    }, {
        id: string;
        source: string;
        target: string;
        sourceHandle?: string | null | undefined;
        targetHandle?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: number;
    nodes: {
        data: Record<string, any>;
        id: string;
        type: string;
        position: {
            x: number;
            y: number;
        };
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
        sourceHandle?: string | null | undefined;
        targetHandle?: string | null | undefined;
    }[];
}, {
    version: number;
    nodes: {
        data: Record<string, any>;
        id: string;
        type: string;
        position: {
            x: number;
            y: number;
        };
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
        sourceHandle?: string | null | undefined;
        targetHandle?: string | null | undefined;
    }[];
}>;
