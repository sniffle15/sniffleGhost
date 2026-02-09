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
                    botId: string;
                    role: string;
                }[];
            } & {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                status: string;
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
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            type: string;
            botId: string;
            description: string;
            permissions: import("@prisma/client/runtime/library").JsonValue | null;
            cooldownSeconds: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        commandId: string;
    }>;
    save(user: any, id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        commandId: string;
    }>;
    validate(user: any, id: string, body: any): Promise<import("@botghost/shared/dist/workflow/validation").ValidationIssue[]>;
    publish(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: import("@prisma/client/runtime/library").JsonValue;
        compiledAstJson: import("@prisma/client/runtime/library").JsonValue | null;
        commandId: string;
    }>;
    testRun(user: any, id: string, body: any): Promise<{
        actions: any[];
        events: import("@botghost/shared").ExecutionEvent[];
        error: string | undefined;
    }>;
}
