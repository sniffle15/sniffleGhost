import { PrismaService } from "../common/prisma.service";
import { LogsService } from "../logs/logs.service";
import { ConfigService } from "@nestjs/config";
export declare class RunnerController {
    private prisma;
    private logs;
    private config;
    constructor(prisma: PrismaService, logs: LogsService, config: ConfigService);
    getBotToken(id: string): Promise<{
        botId: string;
        applicationId: string;
        testGuildId: string | null;
        prefix: string;
        token: string;
    } | null>;
    heartbeat(id: string, body: any): Promise<{
        success: boolean;
    }>;
    createLog(id: string, body: any): Promise<{
        id: string;
        botId: string;
        message: string;
        level: string;
        ts: Date;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getVariable(id: string, scope: string, scopeId: string, key: string): Promise<{
        id: string;
        botId: string;
        createdAt: Date;
        updatedAt: Date;
        value: import("@prisma/client/runtime/library").JsonValue;
        scope: string;
        scopeId: string;
        key: string;
    } | null>;
    setVariable(id: string, body: any): Promise<{
        id: string;
        botId: string;
        createdAt: Date;
        updatedAt: Date;
        value: import("@prisma/client/runtime/library").JsonValue;
        scope: string;
        scopeId: string;
        key: string;
    }>;
    listPublishedCommands(id: string): Promise<{
        id: string;
        name: string;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        cooldownSeconds: number;
        version: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            commandId: string;
            versionNumber: number;
            notes: string | null;
            workflowJson: import("@prisma/client/runtime/library").JsonValue;
            compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }[]>;
    getCommandByName(id: string, commandName: string): Promise<{
        commandId: string;
        name: string;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        cooldownSeconds: number;
        version: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            commandId: string;
            versionNumber: number;
            notes: string | null;
            workflowJson: import("@prisma/client/runtime/library").JsonValue;
            compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } | null>;
    listPublishedEvents(id: string, eventType?: string): Promise<{
        id: string;
        name: string;
        description: string;
        type: string;
        eventType: string | null;
        version: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            commandId: string;
            versionNumber: number;
            notes: string | null;
            workflowJson: import("@prisma/client/runtime/library").JsonValue;
            compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }[]>;
}
