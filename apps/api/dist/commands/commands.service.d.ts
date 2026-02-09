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
    create(userId: string, botId: string, input: any): Promise<{
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
    get(userId: string, commandId: string): Promise<{
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
    update(userId: string, commandId: string, input: any): Promise<{
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
    delete(userId: string, commandId: string): Promise<{
        success: boolean;
    }>;
    listVersions(userId: string, commandId: string): Promise<{
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
    createVersion(userId: string, commandId: string, notes?: string): Promise<{
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
    listEvents(userId: string, botId: string): Promise<any[]>;
    createEvent(userId: string, botId: string, input: any): Promise<any>;
    getEvent(userId: string, eventId: string): Promise<any>;
    updateEvent(userId: string, eventId: string, input: any): Promise<any>;
    deleteEvent(userId: string, eventId: string): Promise<{
        success: boolean;
    }>;
    listEventVersions(userId: string, eventId: string): Promise<{
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
    createEventVersion(userId: string, eventId: string, notes?: string): Promise<{
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
