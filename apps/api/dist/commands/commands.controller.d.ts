import { CommandsService } from "./commands.service";
export declare class CommandsController {
    private commands;
    constructor(commands: CommandsService);
    list(user: any, botId: string): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        botId: string;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
    }[]>;
    create(user: any, botId: string, body: any): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        botId: string;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
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
            status: string;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            ownerId: string;
            description: string | null;
            prefix: string;
            applicationId: string;
            encryptedToken: string;
            testGuildId: string | null;
            lastHeartbeat: Date | null;
            lastError: string | null;
        };
    } & {
        options: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        botId: string;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
    }>;
    update(user: any, id: string, body: any): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        botId: string;
        permissions: import("@prisma/client/runtime/library").JsonValue | null;
        cooldownSeconds: number;
    }>;
    delete(user: any, id: string): Promise<{
        success: boolean;
    }>;
    listVersions(user: any, id: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createVersion(user: any, id: string, body: any): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createEventVersion(user: any, id: string, body: any): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
