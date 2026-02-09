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
        message: string;
        id: string;
        botId: string;
        level: string;
        ts: Date;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getVariable(id: string, scope: string, scopeId: string, key: string): Promise<{
        value: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        scope: string;
        botId: string;
        key: string;
        scopeId: string;
    } | null>;
    setVariable(id: string, body: any): Promise<{
        value: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        scope: string;
        botId: string;
        key: string;
        scopeId: string;
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            commandId: string;
            versionNumber: number;
            notes: string | null;
            workflowJson: import("@prisma/client/runtime/library").JsonValue;
            compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }[]>;
}
