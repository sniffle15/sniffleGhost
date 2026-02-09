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
        message: string;
        id: string;
        botId: string;
        level: string;
        ts: Date;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    create(botId: string, level: string, message: string, meta?: any): Promise<{
        message: string;
        id: string;
        botId: string;
        level: string;
        ts: Date;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
