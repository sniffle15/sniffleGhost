import { ConfigService } from "@nestjs/config";
export declare class QueueService {
    private queue;
    constructor(config: ConfigService);
    addStartBot(botId: string): Promise<import("bullmq").Job<any, any, string>>;
    addStopBot(botId: string): Promise<import("bullmq").Job<any, any, string>>;
    addSyncCommands(botId: string): Promise<import("bullmq").Job<any, any, string>>;
}
