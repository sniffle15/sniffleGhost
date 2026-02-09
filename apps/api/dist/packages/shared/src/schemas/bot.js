"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotUpdateSchema = exports.BotCreateSchema = void 0;
const zod_1 = require("zod");
exports.BotCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    applicationId: zod_1.z.string().min(3),
    token: zod_1.z.string().min(10),
    testGuildId: zod_1.z.string().optional()
});
exports.BotUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    testGuildId: zod_1.z.string().optional(),
    status: zod_1.z.enum(["stopped", "starting", "running", "error"]).optional()
});
//# sourceMappingURL=bot.js.map