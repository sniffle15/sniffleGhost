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
exports.VersionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const queue_service_1 = require("../queue/queue.service");
const shared_1 = require("@botghost/shared");
let VersionsService = class VersionsService {
    constructor(prisma, queue) {
        this.prisma = prisma;
        this.queue = queue;
    }
    async assertVersionRole(userId, versionId, roles) {
        const version = await this.prisma.commandVersion.findFirst({
            where: { id: versionId },
            include: { command: { include: { bot: { include: { members: true } } } } }
        });
        const membership = version?.command?.bot?.members?.find((member) => member.userId === userId);
        if (!version || !membership || !roles.includes(membership.role)) {
            throw new common_1.ForbiddenException("Version not found");
        }
        return version;
    }
    async getVersion(userId, versionId) {
        return this.assertVersionRole(userId, versionId, ["owner", "editor", "viewer"]);
    }
    async saveWorkflow(userId, versionId, workflow) {
        await this.assertVersionRole(userId, versionId, ["owner", "editor"]);
        const compiled = (0, shared_1.compileWorkflow)(workflow);
        const workflowJson = JSON.parse(JSON.stringify(workflow));
        const compiledJson = JSON.parse(JSON.stringify(compiled));
        return this.prisma.commandVersion.update({
            where: { id: versionId },
            data: {
                workflowJson,
                compiledAstJson: compiledJson
            }
        });
    }
    async validate(userId, versionId, workflow) {
        await this.assertVersionRole(userId, versionId, ["owner", "editor", "viewer"]);
        return (0, shared_1.validateWorkflow)(workflow);
    }
    async publish(userId, versionId) {
        const version = await this.assertVersionRole(userId, versionId, ["owner", "editor"]);
        const compiled = (0, shared_1.compileWorkflow)(version.workflowJson);
        const compiledJson = JSON.parse(JSON.stringify(compiled));
        await this.prisma.commandVersion.updateMany({
            where: { commandId: version.commandId, status: "published" },
            data: { status: "draft" }
        });
        const updated = await this.prisma.commandVersion.update({
            where: { id: versionId },
            data: { status: "published", compiledAstJson: compiledJson }
        });
        await this.queue.addSyncCommands(version.command.botId);
        return updated;
    }
    async testRun(userId, versionId, input) {
        const version = await this.assertVersionRole(userId, versionId, ["owner", "editor", "viewer"]);
        const workflow = version.compiledAstJson;
        if (!workflow) {
            throw new common_1.BadRequestException("Workflow not compiled yet");
        }
        const actions = [];
        const handlers = {
            reply: async (content) => {
                actions.push({ type: "reply", content });
            },
            sendChannel: async (channelId, content) => {
                actions.push({ type: "channel", channelId, content });
            },
            sendDm: async (content) => {
                actions.push({ type: "dm", content });
            },
            sendEmbed: async (embed) => {
                actions.push({ type: "embed", embed });
            },
            addRole: async (roleId) => {
                actions.push({ type: "addRole", roleId });
            },
            removeRole: async (roleId) => {
                actions.push({ type: "removeRole", roleId });
            },
            log: async (level, message) => {
                actions.push({ type: "log", level, message });
            },
            httpRequest: async () => ({ status: 200, body: { ok: true } })
        };
        const variableStore = {
            async get() {
                return null;
            },
            async set() { }
        };
        const context = {
            botId: version.command.botId,
            commandName: version.command.name,
            user: {
                id: input?.user?.id ?? "test-user",
                username: input?.user?.username ?? "Tester"
            },
            guild: input?.guild ?? { id: "test-guild" },
            channel: input?.channel ?? { id: "test-channel" },
            options: input?.options ?? {},
            memberRoles: input?.memberRoles ?? [],
            variables: {}
        };
        const result = await (0, shared_1.executeWorkflow)(workflow, context, handlers, variableStore, {
            maxDurationMs: 2000,
            maxNodes: 200
        });
        return { actions, events: result.events, error: result.error };
    }
};
exports.VersionsService = VersionsService;
exports.VersionsService = VersionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, queue_service_1.QueueService])
], VersionsService);
//# sourceMappingURL=versions.service.js.map