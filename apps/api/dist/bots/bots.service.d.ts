import { PrismaService } from "../common/prisma.service";
import { ConfigService } from "@nestjs/config";
import { QueueService } from "../queue/queue.service";
import { LogsService } from "../logs/logs.service";
export declare class BotsService {
    private prisma;
    private config;
    private queue;
    private logs;
    constructor(prisma: PrismaService, config: ConfigService, queue: QueueService, logs: LogsService);
    private botSelect;
    private normalizePrefix;
    private assertRole;
    list(userId: string): Promise<{
        status: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }[]>;
    get(userId: string, botId: string): Promise<{
        status: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    create(userId: string, input: {
        name: string;
        description?: string;
        applicationId: string;
        token: string;
        testGuildId?: string;
        prefix?: string;
    }): Promise<{
        status: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    update(userId: string, botId: string, input: any): Promise<{
        status: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    start(userId: string, botId: string): Promise<{
        success: boolean;
    }>;
    stop(userId: string, botId: string): Promise<{
        success: boolean;
    }>;
    remove(userId: string, botId: string): Promise<{
        success: boolean;
    }>;
}
