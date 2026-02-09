import { PrismaService } from "../common/prisma.service";
export interface BotLogEvent {
    id: string;
    botId: string;
    level: string;
    message: string;
    ts: Date;
    meta?: any;
}
export declare class LogsService {
    private prisma;
    private logSubject;
    constructor(prisma: PrismaService);
    logStream(): import("rxjs").Observable<BotLogEvent>;
    ensureAccess(userId: string, botId: string): Promise<void>;
    list(botId: string, limit?: number): Promise<{
        id: string;
        level: string;
        message: string;
        ts: Date;
        botId: string;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    create(botId: string, level: string, message: string, meta?: any): Promise<{
        id: string;
        level: string;
        message: string;
        ts: Date;
        botId: string;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
