import path from "node:path";
import dotenv from "dotenv";
import IORedis from "ioredis";
import { BotManager } from "./bot-manager";
import { createQueueWorker } from "./queue";
import { logger } from "./logging";

// Load runner-local env first, then optional repo-root .env as fallback.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false });

async function main() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const botManager = new BotManager(redis);
  createQueueWorker(botManager, redis);

  const heartbeatInterval = Number(process.env.HEARTBEAT_INTERVAL_MS ?? "10000");
  setInterval(() => {
    botManager.heartbeatAll().catch((error) => logger.error({ error }, "Heartbeat failed"));
  }, heartbeatInterval);

  logger.info("Runner started");
}

main().catch((error) => {
  logger.error({ error }, "Runner crashed");
  process.exit(1);
});
