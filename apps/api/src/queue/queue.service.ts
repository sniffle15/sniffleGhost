import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";

@Injectable()
export class QueueService {
  private queue: Queue;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue("bot-jobs", { connection });
  }

  addStartBot(botId: string) {
    return this.queue.add("startBot", { botId });
  }

  addStopBot(botId: string) {
    return this.queue.add("stopBot", { botId });
  }

  addSyncCommands(botId: string) {
    return this.queue.add("syncCommands", { botId });
  }

  async removePendingBotJobs(botId: string) {
    const pendingStates = ["waiting", "delayed", "prioritized", "paused", "waiting-children"] as const;
    const jobs = await this.queue.getJobs([...pendingStates], 0, 1000);
    const removePromises = jobs
      .filter((job) => job.data?.botId === botId)
      .map((job) => job.remove().catch(() => undefined));
    await Promise.all(removePromises);
  }
}
