import { CommandsService } from "./commands.service";
export declare class CommandsController {
    private commands;
    constructor(commands: CommandsService);
    list(user: any, botId: string): Promise<{
        id: string;
        botId: string;
        name: string;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(user: any, botId: string, body: any): Promise<{
        id: string;
        botId: string;
        name: string;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    get(user: any, id: string): Promise<{
        bot: {
            members: {
                id: string;
                botId: string;
                createdAt: Date;
                userId: string;
                role: string;
            }[];
        } & {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            ownerId: string;
            prefix: string;
            applicationId: string;
            encryptedToken: string;
            testGuildId: string | null;
            lastHeartbeat: Date | null;
            lastError: string | null;
        };
    } & {
        id: string;
        botId: string;
        name: string;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(user: any, id: string, body: any): Promise<{
        id: string;
        botId: string;
        name: string;
        description: string;
        type: string;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(user: any, id: string): Promise<{
        success: boolean;
    }>;
    listVersions(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createVersion(user: any, id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    listEvents(user: any, botId: string): Promise<any[]>;
    createEvent(user: any, botId: string, body: any): Promise<any>;
    getEvent(user: any, id: string): Promise<any>;
    updateEvent(user: any, id: string, body: any): Promise<any>;
    deleteEvent(user: any, id: string): Promise<{
        success: boolean;
    }>;
    listEventVersions(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createEventVersion(user: any, id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
