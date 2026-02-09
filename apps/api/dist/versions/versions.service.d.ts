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
            options: Prisma.JsonValue | null;
            type: string;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            botId: string;
            permissions: Prisma.JsonValue | null;
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
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
    }>;
    saveWorkflow(userId: string, versionId: string, workflow: WorkflowGraph): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
    }>;
    validate(userId: string, versionId: string, workflow: WorkflowGraph): Promise<import("@botghost/shared/dist/workflow/validation").ValidationIssue[]>;
    publish(userId: string, versionId: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commandId: string;
        versionNumber: number;
        notes: string | null;
        workflowJson: Prisma.JsonValue;
        compiledAstJson: Prisma.JsonValue | null;
    }>;
    testRun(userId: string, versionId: string, input: any): Promise<{
        actions: any[];
        events: import("@botghost/shared").ExecutionEvent[];
        error: string | undefined;
    }>;
}
