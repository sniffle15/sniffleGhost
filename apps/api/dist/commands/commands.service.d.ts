import { PrismaService } from "../common/prisma.service";
export declare class CommandsService {
    private prisma;
    constructor(prisma: PrismaService);
    private commandTypeToEventType;
    private assertCommandType;
    private normalizeCommandName;
    private mapEventTypeToCommandType;
    private toEventDto;
    private assertBotRole;
    private assertCommandRole;
    private createBaseWorkflow;
    list(userId: string, botId: string): Promise<{
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
    create(userId: string, botId: string, input: any): Promise<{
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
    get(userId: string, commandId: string): Promise<{
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
    update(userId: string, commandId: string, input: any): Promise<{
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
    delete(userId: string, commandId: string): Promise<{
        success: boolean;
    }>;
    listVersions(userId: string, commandId: string): Promise<{
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
    createVersion(userId: string, commandId: string, notes?: string): Promise<{
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
    listEvents(userId: string, botId: string): Promise<any[]>;
    createEvent(userId: string, botId: string, input: any): Promise<any>;
    getEvent(userId: string, eventId: string): Promise<any>;
    updateEvent(userId: string, eventId: string, input: any): Promise<any>;
    deleteEvent(userId: string, eventId: string): Promise<{
        success: boolean;
    }>;
    listEventVersions(userId: string, eventId: string): Promise<{
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
    createEventVersion(userId: string, eventId: string, notes?: string): Promise<{
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
