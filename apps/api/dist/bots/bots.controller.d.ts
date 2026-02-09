import { BotsService } from "./bots.service";
export declare class BotsController {
    private bots;
    constructor(bots: BotsService);
    list(user: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        status: string;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }[]>;
    create(user: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        status: string;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    get(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        status: string;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    update(user: any, id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        status: string;
        ownerId: string;
        description: string | null;
        prefix: string;
        applicationId: string;
        testGuildId: string | null;
        lastHeartbeat: Date | null;
        lastError: string | null;
    }>;
    start(user: any, id: string): Promise<{
        success: boolean;
    }>;
    stop(user: any, id: string): Promise<{
        success: boolean;
    }>;
    remove(user: any, id: string): Promise<{
        success: boolean;
    }>;
}
