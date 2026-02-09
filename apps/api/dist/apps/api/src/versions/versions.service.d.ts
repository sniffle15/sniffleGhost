import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { QueueService } from "../queue/queue.service";
import { type WorkflowGraph } from "@botghost/shared";
export declare class VersionsService {
    private prisma;
    private queue;
    constructor(prisma: PrismaService, queue: QueueService);
    private assertVersionRole;
    getVersion(userId: string, versionId: string): Promise<{
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
            options: Prisma.JsonValue | null;
            permissions: Prisma.JsonValue | null;
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
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
        commandId: string;
    }>;
    saveWorkflow(userId: string, versionId: string, workflow: WorkflowGraph): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        notes: string | null;
        versionNumber: number;
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
        commandId: string;
    }>;
    validate(userId: string, versionId: string, workflow: WorkflowGraph): Promise<import("../../../../packages/shared/src/workflow/validation").ValidationIssue[]>;
    publish(userId: string, versionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        notes: string | null;
        versionNumber: number;
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
        commandId: string;
    }>;
    testRun(userId: string, versionId: string, input: any): Promise<{
        actions: any[];
        events: import("@botghost/shared").ExecutionEvent[];
        error: string | undefined;
    }>;
}
