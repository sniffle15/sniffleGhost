"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const ioredis_1 = __importDefault(require("ioredis"));
const bot_manager_1 = require("./bot-manager");
const queue_1 = require("./queue");
const logging_1 = require("./logging");
// Load runner-local env first, then optional repo-root .env as fallback.
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), ".env") });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), "../../.env"), override: false });
async function main() {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const redis = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
    const botManager = new bot_manager_1.BotManager(redis);
    (0, queue_1.createQueueWorker)(botManager, redis);
    const heartbeatInterval = Number(process.env.HEARTBEAT_INTERVAL_MS ?? "10000");
    setInterval(() => {
        botManager.heartbeatAll().catch((error) => logging_1.logger.error({ error }, "Heartbeat failed"));
    }, heartbeatInterval);
    logging_1.logger.info("Runner started");
}
main().catch((error) => {
    logging_1.logger.error({ error }, "Runner crashed");
    process.exit(1);
});
