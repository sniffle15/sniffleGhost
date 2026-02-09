"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueueWorker = createQueueWorker;
const bullmq_1 = require("bullmq");
const logging_1 = require("./logging");
function createQueueWorker(botManager, redis) {
    const worker = new bullmq_1.Worker("bot-jobs", async (job) => {
        const { botId } = job.data;
        if (!botId)
            return;
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
        }
        catch (error) {
            logging_1.logger.error({ botId, error }, "Job failed");
        }
    }, { connection: redis });
    worker.on("failed", (job, err) => {
        logging_1.logger.error({ jobId: job?.id, err }, "Queue job failed");
    });
    return worker;
}
