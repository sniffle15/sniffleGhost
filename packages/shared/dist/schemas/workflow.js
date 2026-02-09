"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowGraphSchema = void 0;
const zod_1 = require("zod");
exports.WorkflowGraphSchema = zod_1.z.object({
    version: zod_1.z.number(),
    nodes: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        position: zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }),
        data: zod_1.z.record(zod_1.z.any())
    })),
    edges: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        source: zod_1.z.string(),
        target: zod_1.z.string(),
        sourceHandle: zod_1.z.string().nullable().optional(),
        targetHandle: zod_1.z.string().nullable().optional()
    }))
});
