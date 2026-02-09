import { LogsService } from "./logs.service";
export declare class LogsController {
    private logs;
    constructor(logs: LogsService);
    list(user: any, id: string, limit?: string): Promise<{
        id: string;
        message: string;
        botId: string;
        level: string;
        ts: Date;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    stream(user: any, id: string): Promise<import("rxjs").Observable<{
        data: import("./logs.service").BotLogEvent;
    }>>;
}
