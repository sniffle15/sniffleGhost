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
        token: string;
    } | null>;
    heartbeat(id: string, body: any): Promise<{
        success: boolean;
    }>;
    createLog(id: string, body: any): Promise<{
        id: string;
        level: string;
        message: string;
        ts: Date;
        botId: string;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getVariable(id: string, scope: string, scopeId: string, key: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        scope: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        botId: string;
        scopeId: string;
    } | null>;
    setVariable(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        scope: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        botId: string;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            notes: string | null;
            versionNumber: number;
            workflowJson: import("@prisma/client/runtime/library").JsonValue;
            compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
            commandId: string;
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
            notes: string | null;
            versionNumber: number;
            workflowJson: import("@prisma/client/runtime/library").JsonValue;
            compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
            commandId: string;
        };
    } | null>;
}
