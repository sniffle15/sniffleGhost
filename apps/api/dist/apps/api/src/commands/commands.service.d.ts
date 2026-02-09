import { PrismaService } from "../common/prisma.service";
export declare class CommandsService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertBotRole;
    private assertCommandRole;
    private createBaseWorkflow;
    list(userId: string, botId: string): Promise<{
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
    create(userId: string, botId: string, input: any): Promise<{
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
    update(userId: string, commandId: string, input: any): Promise<{
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
    listVersions(userId: string, commandId: string): Promise<{
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
    createVersion(userId: string, commandId: string, notes?: string): Promise<{
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
