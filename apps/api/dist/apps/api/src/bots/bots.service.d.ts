import { PrismaService } from "../common/prisma.service";
import { ConfigService } from "@nestjs/config";
import { QueueService } from "../queue/queue.service";
export declare class BotsService {
    private prisma;
    private config;
    private queue;
    constructor(prisma: PrismaService, config: ConfigService, queue: QueueService);
    private botSelect;
    private assertRole;
    list(userId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        status: string;
        applicationId: string;
        testGuildId: string | null;
        ownerId: string;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }[]>;
    get(userId: string, botId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        status: string;
        applicationId: string;
        testGuildId: string | null;
        ownerId: string;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    create(userId: string, input: {
        name: string;
        description?: string;
        applicationId: string;
        token: string;
        testGuildId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        status: string;
        applicationId: string;
        testGuildId: string | null;
        ownerId: string;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    update(userId: string, botId: string, input: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        status: string;
        applicationId: string;
        testGuildId: string | null;
        ownerId: string;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    start(userId: string, botId: string): Promise<{
        success: boolean;
    }>;
    stop(userId: string, botId: string): Promise<{
        success: boolean;
    }>;
}
