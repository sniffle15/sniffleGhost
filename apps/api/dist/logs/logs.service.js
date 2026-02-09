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
exports.LogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const rxjs_1 = require("rxjs");
let LogsService = class LogsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logSubject = new rxjs_1.Subject();
    }
    logStream() {
        return this.logSubject.asObservable();
    }
    async ensureAccess(userId, botId) {
        const membership = await this.prisma.botMember.findFirst({ where: { botId, userId } });
        if (!membership)
            throw new common_1.ForbiddenException("Bot not found");
    }
    async list(botId, limit = 200) {
        return this.prisma.botLog.findMany({
            where: { botId },
            orderBy: { ts: "desc" },
            take: limit
        });
    }
    async create(botId, level, message, meta) {
        const log = await this.prisma.botLog.create({
            data: {
                botId,
                level,
                message,
                meta
            }
        });
        this.logSubject.next({
            id: log.id,
            botId: log.botId,
            level: log.level,
            message: log.message,
            ts: log.ts,
            meta: log.meta
        });
        return log;
    }
};
exports.LogsService = LogsService;
exports.LogsService = LogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LogsService);
//# sourceMappingURL=logs.service.js.map