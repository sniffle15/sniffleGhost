import { logger } from "./logging";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const RUNNER_SECRET = process.env.RUNNER_SECRET ?? "runner-secret";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    logger.error({ status: response.status, text }, "Runner API request failed");
    throw new Error(`Runner API error: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function requestOptional<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-runner-secret": RUNNER_SECRET,
      ...(options.headers ?? {})
    }
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, text }, "Runner API request failed");
    throw new Error(`Runner API error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return (await response.json()) as T;
}

export const RunnerApi = {
  getBotToken: (botId: string) =>
    request<{ botId: string; token: string; applicationId: string; testGuildId?: string; prefix?: string }>(`/runner/bots/${botId}/token`),
  listCommands: (botId: string) => request<any[]>(`/runner/bots/${botId}/commands`),
  getCommand: (botId: string, commandName: string) =>
    requestOptional<any>(`/runner/bots/${botId}/commands/${encodeURIComponent(commandName)}`),
  listEvents: (botId: string, eventType?: string) =>
    request<any[]>(`/runner/bots/${botId}/events${eventType ? `?eventType=${encodeURIComponent(eventType)}` : ""}`),
  getVariable: (botId: string, scope: string, scopeId: string, key: string) =>
    request<any>(`/runner/bots/${botId}/variables?scope=${scope}&scopeId=${scopeId}&key=${key}`),
  setVariable: (botId: string, scope: string, scopeId: string, key: string, value: unknown) =>
    request<any>(`/runner/bots/${botId}/variables`, {
      method: "PUT",
      body: JSON.stringify({ scope, scopeId, key, value })
    }),
  heartbeat: (botId: string, status: string, error?: string) => request(`/runner/bots/${botId}/heartbeat`, {
    method: "POST",
    body: JSON.stringify({ status, error })
  }),
  log: (botId: string, level: string, message: string, meta?: any) => request(`/runner/bots/${botId}/logs`, {
    method: "POST",
    body: JSON.stringify({ level, message, meta })
  })
};
