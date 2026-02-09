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
const COMMAND_TYPES = new Set(["SLASH", "PREFIX"]);
const EVENT_TYPES = shared_1.EventTypeSchema.options;
const EVENT_COMMAND_TYPES = new Set(EVENT_TYPES.map((eventType) => `EVENT_${eventType}`));
let CommandsService = class CommandsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    commandTypeToEventType(commandType) {
        if (!commandType.startsWith("EVENT_"))
            return null;
        const eventType = commandType.slice("EVENT_".length);
        return EVENT_TYPES.includes(eventType) ? eventType : null;
    }
    assertCommandType(type) {
        if (!COMMAND_TYPES.has(type)) {
            throw new common_1.BadRequestException("Unsupported command type");
        }
    }
    normalizeCommandName(name, type) {
        const trimmed = String(name ?? "").trim();
        if (!trimmed) {
            throw new common_1.BadRequestException("Command name is required");
        }
        if (type === "PREFIX") {
            return trimmed.replace(/^\/+/, "");
        }
        return trimmed.replace(/^\/+/, "");
    }
    mapEventTypeToCommandType(eventType) {
        if (!EVENT_TYPES.includes(eventType)) {
            throw new common_1.BadRequestException("Unsupported event type");
        }
        return `EVENT_${eventType}`;
    }
    toEventDto(command) {
        return {
            ...command,
            eventType: this.commandTypeToEventType(command.type)
        };
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
    createBaseWorkflow(input) {
        const triggerNode = input.eventType
            ? {
                id: "trigger",
                type: "MessageCreateTrigger",
                position: { x: 0, y: 0 },
                data: { eventType: input.eventType }
            }
            : {
                id: "trigger",
                type: "SlashCommandTrigger",
                position: { x: 0, y: 0 },
                data: { commandName: input.commandName ?? "command" }
            };
        return {
            version: shared_1.WORKFLOW_SCHEMA_VERSION,
            nodes: [
                triggerNode,
                {
                    id: "stop",
                    type: "Stop",
                    position: { x: 0, y: 160 },
                    data: {}
                }
            ],
            edges: [{ id: "e1", source: "trigger", target: "stop" }]
        };
    }
    async list(userId, botId) {
        await this.assertBotRole(userId, botId, ["owner", "editor", "viewer"]);
        return this.prisma.command.findMany({
            where: { botId, type: { in: [...COMMAND_TYPES] } },
            orderBy: { createdAt: "desc" }
        });
    }
    async create(userId, botId, input) {
        this.assertCommandType(input.type);
        await this.assertBotRole(userId, botId, ["owner", "editor"]);
        const normalizedName = this.normalizeCommandName(input.name, input.type);
        const command = await this.prisma.command.create({
            data: {
                botId,
                name: normalizedName,
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
                workflowJson: this.createBaseWorkflow({ commandName: command.name })
            }
        });
        return command;
    }
    async get(userId, commandId) {
        const command = await this.assertCommandRole(userId, commandId, ["owner", "editor", "viewer"]);
        if (!COMMAND_TYPES.has(command.type))
            throw new common_1.ForbiddenException("Command not found");
        return command;
    }
    async update(userId, commandId, input) {
        const existing = await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
        if (input.type)
            this.assertCommandType(input.type);
        const effectiveType = input.type ?? existing.type;
        const normalizedName = input.name !== undefined ? this.normalizeCommandName(input.name, effectiveType) : undefined;
        return this.prisma.command.update({
            where: { id: commandId },
            data: {
                name: normalizedName,
                description: input.description,
                type: input.type,
                options: input.options,
                permissions: input.permissions,
                cooldownSeconds: input.cooldownSeconds
            }
        });
    }
    async delete(userId, commandId) {
        const command = await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
        if (!COMMAND_TYPES.has(command.type))
            throw new common_1.ForbiddenException("Command not found");
        await this.prisma.$transaction([
            this.prisma.commandVersion.deleteMany({ where: { commandId } }),
            this.prisma.command.delete({ where: { id: commandId } })
        ]);
        return { success: true };
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
        if (!COMMAND_TYPES.has(command.type))
            throw new common_1.ForbiddenException("Command not found");
        const latest = await this.prisma.commandVersion.findFirst({
            where: { commandId },
            orderBy: { versionNumber: "desc" }
        });
        const nextVersion = (latest?.versionNumber ?? 0) + 1;
        const workflowJson = latest?.workflowJson ?? this.createBaseWorkflow({ commandName: command.name });
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
    async listEvents(userId, botId) {
        await this.assertBotRole(userId, botId, ["owner", "editor", "viewer"]);
        const events = await this.prisma.command.findMany({
            where: { botId, type: { in: [...EVENT_COMMAND_TYPES] } },
            orderBy: { createdAt: "desc" }
        });
        return events.map((event) => this.toEventDto(event));
    }
    async createEvent(userId, botId, input) {
        await this.assertBotRole(userId, botId, ["owner", "editor"]);
        const mappedType = this.mapEventTypeToCommandType(input.eventType);
        const event = await this.prisma.command.create({
            data: {
                botId,
                name: input.name,
                description: input.description,
                type: mappedType,
                options: [],
                permissions: { adminOnly: false, roleAllowlist: [], channelAllowlist: [] },
                cooldownSeconds: 0
            }
        });
        await this.prisma.commandVersion.create({
            data: {
                commandId: event.id,
                versionNumber: 1,
                status: "draft",
                workflowJson: this.createBaseWorkflow({ eventType: input.eventType })
            }
        });
        return this.toEventDto(event);
    }
    async getEvent(userId, eventId) {
        const event = await this.assertCommandRole(userId, eventId, ["owner", "editor", "viewer"]);
        if (!EVENT_COMMAND_TYPES.has(event.type))
            throw new common_1.ForbiddenException("Event not found");
        return this.toEventDto(event);
    }
    async updateEvent(userId, eventId, input) {
        await this.assertCommandRole(userId, eventId, ["owner", "editor"]);
        const data = {
            name: input.name,
            description: input.description
        };
        if (input.eventType) {
            data.type = this.mapEventTypeToCommandType(input.eventType);
        }
        const updated = await this.prisma.command.update({
            where: { id: eventId },
            data
        });
        return this.toEventDto(updated);
    }
    async deleteEvent(userId, eventId) {
        const event = await this.assertCommandRole(userId, eventId, ["owner", "editor"]);
        if (!EVENT_COMMAND_TYPES.has(event.type))
            throw new common_1.ForbiddenException("Event not found");
        await this.prisma.$transaction([
            this.prisma.commandVersion.deleteMany({ where: { commandId: eventId } }),
            this.prisma.command.delete({ where: { id: eventId } })
        ]);
        return { success: true };
    }
    async listEventVersions(userId, eventId) {
        await this.getEvent(userId, eventId);
        return this.prisma.commandVersion.findMany({
            where: { commandId: eventId },
            orderBy: { versionNumber: "desc" }
        });
    }
    async createEventVersion(userId, eventId, notes) {
        const event = await this.assertCommandRole(userId, eventId, ["owner", "editor"]);
        if (!EVENT_COMMAND_TYPES.has(event.type))
            throw new common_1.ForbiddenException("Event not found");
        const eventType = this.commandTypeToEventType(event.type);
        if (!eventType)
            throw new common_1.BadRequestException("Unsupported event type");
        const latest = await this.prisma.commandVersion.findFirst({
            where: { commandId: eventId },
            orderBy: { versionNumber: "desc" }
        });
        const nextVersion = (latest?.versionNumber ?? 0) + 1;
        const workflowJson = latest?.workflowJson ?? this.createBaseWorkflow({ eventType });
        return this.prisma.commandVersion.create({
            data: {
                commandId: eventId,
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