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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const shared_1 = require("@botghost/shared");
let CommandsService = class CommandsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertBotRole(userId, botId, roles) {
        const membership = await this.prisma.botMember.findFirst({ where: { botId, userId } });
        if (!membership || !roles.includes(membership.role))
            throw new common_1.ForbiddenException("Bot access denied");
        return membership;
    }
    async assertCommandRole(userId, commandId, roles) {
        const command = await this.prisma.command.findFirst({
            where: { id: commandId },
            include: { bot: { include: { members: true } } }
        });
        const membership = command?.bot?.members?.find((member) => member.userId === userId);
        if (!command || !membership || !roles.includes(membership.role))
            throw new common_1.ForbiddenException("Command not found");
        return command;
    }
    createBaseWorkflow(commandName) {
        return {
            version: shared_1.WORKFLOW_SCHEMA_VERSION,
            nodes: [
                {
                    id: "trigger",
                    type: "SlashCommandTrigger",
                    position: { x: 0, y: 0 },
                    data: { commandName }
                },
                {
                    id: "stop",
                    type: "Stop",
                    position: { x: 200, y: 0 },
                    data: {}
                }
            ],
            edges: [{ id: "e1", source: "trigger", target: "stop" }]
        };
    }
    async list(userId, botId) {
        await this.assertBotRole(userId, botId, ["owner", "editor", "viewer"]);
        return this.prisma.command.findMany({
            where: { botId },
            orderBy: { createdAt: "desc" }
        });
    }
    async create(userId, botId, input) {
        await this.assertBotRole(userId, botId, ["owner", "editor"]);
        const command = await this.prisma.command.create({
            data: {
                botId,
                name: input.name,
                description: input.description,
                type: input.type,
                options: input.options ?? [],
                permissions: input.permissions ?? { adminOnly: false, roleAllowlist: [], channelAllowlist: [] },
                cooldownSeconds: input.cooldownSeconds ?? 0
            }
        });
        await this.prisma.commandVersion.create({
            data: {
                commandId: command.id,
                versionNumber: 1,
                status: "draft",
                workflowJson: this.createBaseWorkflow(command.name)
            }
        });
        return command;
    }
    async get(userId, commandId) {
        return this.assertCommandRole(userId, commandId, ["owner", "editor", "viewer"]);
    }
    async update(userId, commandId, input) {
        await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
        return this.prisma.command.update({
            where: { id: commandId },
            data: {
                name: input.name,
                description: input.description,
                type: input.type,
                options: input.options,
                permissions: input.permissions,
                cooldownSeconds: input.cooldownSeconds
            }
        });
    }
    async listVersions(userId, commandId) {
        await this.assertCommandRole(userId, commandId, ["owner", "editor", "viewer"]);
        return this.prisma.commandVersion.findMany({
            where: { commandId },
            orderBy: { versionNumber: "desc" }
        });
    }
    async createVersion(userId, commandId, notes) {
        const command = await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
        const latest = await this.prisma.commandVersion.findFirst({
            where: { commandId },
            orderBy: { versionNumber: "desc" }
        });
        const nextVersion = (latest?.versionNumber ?? 0) + 1;
        const workflowJson = latest?.workflowJson ?? this.createBaseWorkflow(command.name);
        return this.prisma.commandVersion.create({
            data: {
                commandId,
                versionNumber: nextVersion,
                status: "draft",
                notes,
                workflowJson
            }
        });
    }
};
exports.CommandsService = CommandsService;
exports.CommandsService = CommandsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommandsService);
//# sourceMappingURL=commands.service.js.map