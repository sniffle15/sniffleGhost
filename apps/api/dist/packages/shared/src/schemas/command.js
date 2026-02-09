"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandVersionCreateSchema = exports.CommandUpdateSchema = exports.CommandCreateSchema = exports.CommandPermissionsSchema = exports.CommandTypeSchema = void 0;
const zod_1 = require("zod");
exports.CommandTypeSchema = zod_1.z.enum(["SLASH", "PREFIX"]);
exports.CommandPermissionsSchema = zod_1.z.object({
    adminOnly: zod_1.z.boolean().default(false),
    roleAllowlist: zod_1.z.array(zod_1.z.string()).default([]),
    channelAllowlist: zod_1.z.array(zod_1.z.string()).default([])
});
exports.CommandCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    type: exports.CommandTypeSchema,
    options: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        description: zod_1.z.string().min(1).optional(),
        type: zod_1.z.enum(["string", "int", "bool", "user", "channel", "role"]).default("string"),
        required: zod_1.z.boolean().default(false)
    }))
        .optional(),
    permissions: exports.CommandPermissionsSchema.optional(),
    cooldownSeconds: zod_1.z.number().int().min(0).default(0)
});
exports.CommandUpdateSchema = exports.CommandCreateSchema.partial();
exports.CommandVersionCreateSchema = zod_1.z.object({
    notes: zod_1.z.string().optional()
});
//# sourceMappingURL=command.js.map