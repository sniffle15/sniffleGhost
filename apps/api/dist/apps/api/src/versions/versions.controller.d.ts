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
        };
    } & {
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
    save(user: any, id: string, body: any): Promise<{
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
    validate(user: any, id: string, body: any): Promise<import("../../../../packages/shared/src/workflow/validation").ValidationIssue[]>;
    publish(user: any, id: string): Promise<{
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
    testRun(user: any, id: string, body: any): Promise<{
        actions: any[];
        events: import("@botghost/shared").ExecutionEvent[];
        error: string | undefined;
    }>;
}
