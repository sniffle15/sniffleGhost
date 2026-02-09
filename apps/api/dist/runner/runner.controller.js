"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnerController = void 0;
const common_1 = require("@nestjs/common");
const runner_guard_1 = require("./runner.guard");
const prisma_service_1 = require("../common/prisma.service");
const logs_service_1 = require("../logs/logs.service");
const config_1 = require("@nestjs/config");
const encryption_1 = require("../common/encryption");
const shared_1 = require("@botghost/shared");
const RUNNER_COMMAND_TYPES = ["SLASH", "PREFIX"];
const RUNNER_EVENT_TYPES = shared_1.EventTypeSchema.options;
const RUNNER_EVENT_COMMAND_TYPES = RUNNER_EVENT_TYPES.map((eventType) => `EVENT_${eventType}`);
let RunnerController = class RunnerController {
    constructor(prisma, logs, config) {
        this.prisma = prisma;
        this.logs = logs;
        this.config = config;
    }
    async getBotToken(id) {
        const bot = await this.prisma.bot.findUnique({ where: { id } });
        if (!bot)
            return null;
        const secret = this.config.get("ENCRYPTION_KEY") ?? "";
        const fallbackRaw = this.config.get("ENCRYPTION_KEY_FALLBACKS") ?? "";
        const fallbackSecrets = fallbackRaw.split(",").map((item) => item.trim()).filter(Boolean);
        try {
            const resolved = (0, encryption_1.decryptTokenWithFallback)(bot.encryptedToken, [secret, ...fallbackSecrets]);
            if (resolved.usedSecret !== secret && secret) {
                await this.prisma.bot.update({
                    where: { id: bot.id },
                    data: { encryptedToken: (0, encryption_1.encryptToken)(resolved.token, secret), lastError: null }
                });
            }
            return {
                botId: bot.id,
                applicationId: bot.applicationId,
                testGuildId: bot.testGuildId,
                prefix: bot.prefix,
                token: resolved.token
            };
        }
        catch (error) {
            const message = "Bot token could not be decrypted. Re-save the token in bot settings.";
            await this.prisma.bot.update({
                where: { id: bot.id },
                data: { status: "error", lastError: message }
            });
            await this.logs.create(bot.id, "error", `${message} (${error?.message ?? "decrypt failed"})`);
            throw new common_1.BadRequestException(message);
        }
    }
    async heartbeat(id, body) {
        await this.prisma.bot.update({
            where: { id },
            data: {
                status: body.status ?? "running",
                lastHeartbeat: new Date(),
                lastError: body.error ?? null
            }
        });
        return { success: true };
    }
    async createLog(id, body) {
        return this.logs.create(id, body.level ?? "info", body.message ?? "", body.meta);
    }
    async getVariable(id, scope, scopeId, key) {
        if (!scope || !scopeId || !key)
            return null;
        return this.prisma.persistentVariable.findFirst({
            where: { botId: id, scope, scopeId, key }
        });
    }
    async setVariable(id, body) {
        const { scope, scopeId, key, value } = body ?? {};
        return this.prisma.persistentVariable.upsert({
            where: { botId_scope_scopeId_key: { botId: id, scope, scopeId, key } },
            update: { value },
            create: { botId: id, scope, scopeId, key, value }
        });
    }
    async listPublishedCommands(id) {
        const commands = await this.prisma.command.findMany({
            where: { botId: id, type: { in: RUNNER_COMMAND_TYPES } },
            include: {
                versions: {
                    where: { status: "published" },
                    orderBy: { versionNumber: "desc" },
                    take: 1
                }
            }
        });
        return commands
            .filter((command) => command.versions.length > 0)
            .map((command) => ({
            id: command.id,
            name: command.name,
            description: command.description,
            type: command.type,
            options: command.options,
            permissions: command.permissions,
            cooldownSeconds: command.cooldownSeconds,
            version: command.versions[0]
        }));
    }
    async getCommandByName(id, commandName) {
        const normalizedName = String(commandName ?? "").trim().replace(/^\/+/, "");
        const command = await this.prisma.command.findFirst({
            where: {
                botId: id,
                type: { in: RUNNER_COMMAND_TYPES },
                name: { equals: normalizedName, mode: "insensitive" }
            },
            include: {
                versions: {
                    where: { status: "published" },
                    orderBy: { versionNumber: "desc" },
                    take: 1
                }
            }
        });
        if (!command || command.versions.length === 0)
            return null;
        return {
            commandId: command.id,
            name: command.name,
            description: command.description,
            type: command.type,
            options: command.options,
            permissions: command.permissions,
            cooldownSeconds: command.cooldownSeconds,
            version: command.versions[0]
        };
    }
    async listPublishedEvents(id, eventType) {
        const where = {
            botId: id,
            type: { in: RUNNER_EVENT_COMMAND_TYPES }
        };
        if (eventType) {
            if (!RUNNER_EVENT_TYPES.includes(eventType))
                return [];
            where.type = `EVENT_${eventType}`;
        }
        const events = await this.prisma.command.findMany({
            where,
            include: {
                versions: {
                    where: { status: "published" },
                    orderBy: { versionNumber: "desc" },
                    take: 1
                }
            }
        });
        return events
            .filter((event) => event.versions.length > 0)
            .map((event) => ({
            id: event.id,
            name: event.name,
            description: event.description,
            type: event.type,
            eventType: event.type.startsWith("EVENT_") ? event.type.slice("EVENT_".length) : null,
            version: event.versions[0]
        }));
    }
};
exports.RunnerController = RunnerController;
__decorate([
    (0, common_1.Get)("/bots/:id/token"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "getBotToken", null);
__decorate([
    (0, common_1.Post)("/bots/:id/heartbeat"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Post)("/bots/:id/logs"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "createLog", null);
__decorate([
    (0, common_1.Get)("/bots/:id/variables"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("scope")),
    __param(2, (0, common_1.Query)("scopeId")),
    __param(3, (0, common_1.Query)("key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "getVariable", null);
__decorate([
    (0, common_1.Put)("/bots/:id/variables"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "setVariable", null);
__decorate([
    (0, common_1.Get)("/bots/:id/commands"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "listPublishedCommands", null);
__decorate([
    (0, common_1.Get)("/bots/:id/commands/:commandName"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("commandName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "getCommandByName", null);
__decorate([
    (0, common_1.Get)("/bots/:id/events"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("eventType")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RunnerController.prototype, "listPublishedEvents", null);
exports.RunnerController = RunnerController = __decorate([
    (0, common_1.Controller)("/runner"),
    (0, common_1.UseGuards)(runner_guard_1.RunnerGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logs_service_1.LogsService,
        config_1.ConfigService])
], RunnerController);
//# sourceMappingURL=runner.controller.js.map