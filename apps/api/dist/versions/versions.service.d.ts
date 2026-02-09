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
            options: Prisma.JsonValue | null;
            type: string;
            botId: string;
            description: string;
            permissions: Prisma.JsonValue | null;
            cooldownSeconds: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
        commandId: string;
    }>;
    saveWorkflow(userId: string, versionId: string, workflow: WorkflowGraph): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
        commandId: string;
    }>;
    validate(userId: string, versionId: string, workflow: WorkflowGraph): Promise<import("@botghost/shared/dist/workflow/validation").ValidationIssue[]>;
    publish(userId: string, versionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        versionNumber: number;
        notes: string | null;
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
