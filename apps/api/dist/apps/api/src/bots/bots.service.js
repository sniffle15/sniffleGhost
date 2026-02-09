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
exports.BotsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const encryption_1 = require("../common/encryption");
const config_1 = require("@nestjs/config");
const queue_service_1 = require("../queue/queue.service");
let BotsService = class BotsService {
    constructor(prisma, config, queue) {
        this.prisma = prisma;
        this.config = config;
        this.queue = queue;
        this.botSelect = {
            id: true,
            ownerId: true,
            name: true,
            description: true,
            applicationId: true,
            status: true,
            testGuildId: true,
            lastHeartbeat: true,
            lastError: true,
            createdAt: true,
            updatedAt: true
        };
    }
    async assertRole(userId, botId, roles) {
        const membership = await this.prisma.botMember.findFirst({
            where: { botId, userId }
        });
        if (!membership || !roles.includes(membership.role)) {
            throw new common_1.ForbiddenException("Bot access denied");
        }
        return membership;
    }
    async list(userId) {
        return this.prisma.bot.findMany({
            where: { members: { some: { userId } } },
            orderBy: { createdAt: "desc" },
            select: this.botSelect
        });
    }
    async get(userId, botId) {
        await this.assertRole(userId, botId, ["owner", "editor", "viewer"]);
        const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: this.botSelect });
        if (!bot)
            throw new common_1.NotFoundException("Bot not found");
        return bot;
    }
    async create(userId, input) {
        const secret = this.config.get("ENCRYPTION_KEY");
        if (!secret)
            throw new common_1.BadRequestException("ENCRYPTION_KEY missing");
        const encryptedToken = (0, encryption_1.encryptToken)(input.token, secret);
        const bot = await this.prisma.bot.create({
            data: {
                ownerId: userId,
                name: input.name,
                description: input.description,
                applicationId: input.applicationId,
                encryptedToken,
                testGuildId: input.testGuildId,
                members: {
                    create: {
                        userId,
                        role: "owner"
                    }
                }
            },
            select: this.botSelect
        });
        return bot;
    }
    async update(userId, botId, input) {
        await this.assertRole(userId, botId, ["owner", "editor"]);
        return this.prisma.bot.update({
            where: { id: botId },
            data: {
                name: input.name,
                description: input.description,
                testGuildId: input.testGuildId,
                status: input.status
            },
            select: this.botSelect
        });
    }
    async start(userId, botId) {
        await this.assertRole(userId, botId, ["owner", "editor"]);
        await this.prisma.bot.update({ where: { id: botId }, data: { status: "starting" } });
        await this.queue.addStartBot(botId);
        return { success: true };
    }
    async stop(userId, botId) {
        await this.assertRole(userId, botId, ["owner", "editor"]);
        await this.queue.addStopBot(botId);
        await this.prisma.bot.update({ where: { id: botId }, data: { status: "stopped" } });
        return { success: true };
    }
};
exports.BotsService = BotsService;
exports.BotsService = BotsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        queue_service_1.QueueService])
], BotsService);
//# sourceMappingURL=bots.service.js.map