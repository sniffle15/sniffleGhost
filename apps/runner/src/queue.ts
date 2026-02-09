import { Worker } from "bullmq";
import IORedis from "ioredis";
import { BotManager } from "./bot-manager";
import { logger } from "./logging";

export function createQueueWorker(botManager: BotManager, redis: IORedis) {
  const worker = new Worker(
    "bot-jobs",
    async (job) => {
      const { botId } = job.data as { botId: string };
      if (!botId) return;

      try {
        if (job.name === "startBot") {
          await botManager.startBot(botId);
        }
        if (job.name === "stopBot") {
          await botManager.stopBot(botId);
        }
        if (job.name === "syncCommands") {
          await botManager.syncCommands(botId);
        }
      } catch (error: any) {
        logger.error({ botId, error }, "Job failed");
      }
    },
    { connection: redis }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Queue job failed");
  });

  return worker;
}
