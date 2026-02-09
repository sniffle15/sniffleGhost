import { VersionsService } from "./versions.service";
export declare class VersionsController {
    private versions;
    constructor(versions: VersionsService);
    get(user: any, id: string): Promise<{
        command: {
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
        };
    } & {
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
    save(user: any, id: string, body: any): Promise<{
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
    validate(user: any, id: string, body: any): Promise<import("@botghost/shared/dist/workflow/validation").ValidationIssue[]>;
    publish(user: any, id: string): Promise<{
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
    testRun(user: any, id: string, body: any): Promise<{
        actions: any[];
        events: import("@botghost/shared").ExecutionEvent[];
        error: string | undefined;
    }>;
}
