"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnerApi = void 0;
const logging_1 = require("./logging");
const isProd = process.env.NODE_ENV === "production";
const API_URL = process.env.API_URL ?? (isProd ? "" : "http://localhost:4000");
const RUNNER_SECRET = process.env.RUNNER_SECRET ?? (isProd ? "" : "runner-secret");
if (!API_URL) {
    throw new Error("API_URL is required");
}
if (!RUNNER_SECRET) {
    throw new Error("RUNNER_SECRET is required");
}
async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "content-type": "application/json",
            "x-runner-secret": RUNNER_SECRET,
            ...(options.headers ?? {})
        }
    });
    if (!response.ok) {
        const text = await response.text();
        logging_1.logger.error({ status: response.status, text }, "Runner API request failed");
        throw new Error(`Runner API error: ${response.status}`);
    }
    if (response.status === 204)
        return undefined;
    return (await response.json());
}
async function requestOptional(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "content-type": "application/json",
            "x-runner-secret": RUNNER_SECRET,
            ...(options.headers ?? {})
        }
    });
    if (response.status === 404)
        return null;
    if (!response.ok) {
        const text = await response.text();
        logging_1.logger.error({ status: response.status, text }, "Runner API request failed");
        throw new Error(`Runner API error: ${response.status}`);
    }
    if (response.status === 204)
        return null;
    return (await response.json());
}
exports.RunnerApi = {
    getBotToken: (botId) => request(`/runner/bots/${botId}/token`),
    listCommands: (botId) => request(`/runner/bots/${botId}/commands`),
    getCommand: (botId, commandName) => requestOptional(`/runner/bots/${botId}/commands/${encodeURIComponent(commandName)}`),
    listEvents: (botId, eventType) => request(`/runner/bots/${botId}/events${eventType ? `?eventType=${encodeURIComponent(eventType)}` : ""}`),
    getVariable: (botId, scope, scopeId, key) => request(`/runner/bots/${botId}/variables?scope=${scope}&scopeId=${scopeId}&key=${key}`),
    setVariable: (botId, scope, scopeId, key, value) => request(`/runner/bots/${botId}/variables`, {
        method: "PUT",
        body: JSON.stringify({ scope, scopeId, key, value })
    }),
    heartbeat: (botId, status, error) => request(`/runner/bots/${botId}/heartbeat`, {
        method: "POST",
        body: JSON.stringify({ status, error })
    }),
    log: (botId, level, message, meta) => request(`/runner/bots/${botId}/logs`, {
        method: "POST",
        body: JSON.stringify({ level, message, meta })
    })
};
