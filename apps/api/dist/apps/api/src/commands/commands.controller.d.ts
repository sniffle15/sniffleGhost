import { CommandsService } from "./commands.service";
export declare class CommandsController {
    private commands;
    constructor(commands: CommandsService);
    list(user: any, botId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        botId: string;
    }[]>;
    create(user: any, botId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        botId: string;
    }>;
    get(user: any, id: string): Promise<{
        bot: {
            members: {
                id: string;
                createdAt: Date;
                userId: string;
                role: string;
                botId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            status: string;
            applicationId: string;
            testGuildId: string | null;
            ownerId: string;
            encryptedToken: string;
            lastHeartbeat: Date | null;
            lastError: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        botId: string;
    }>;
    update(user: any, id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        botId: string;
    }>;
    listVersions(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        notes: string | null;
        versionNumber: number;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        commandId: string;
    }[]>;
    createVersion(user: any, id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        notes: string | null;
        versionNumber: number;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        commandId: string;
    }>;
}
