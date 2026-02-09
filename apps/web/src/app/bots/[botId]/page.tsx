"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { authFetch, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/api";

interface Bot {
  id: string;
  name: string;
  description?: string;
  prefix?: string;
  status: string;
  lastHeartbeat?: string;
  testGuildId?: string;
}

function statusTone(status?: string) {
  if (status === "running") return "bg-emerald-500/20 text-emerald-200 border-emerald-300/30";
  if (status === "starting") return "bg-amber-500/20 text-amber-200 border-amber-300/30";
  if (status === "error") return "bg-rose-500/20 text-rose-200 border-rose-300/30";
  return "bg-white/10 text-fog/70 border-white/20";
}

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.botId as string;
  const [bot, setBot] = useState<Bot | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [newToken, setNewToken] = useState("");
  const [prefix, setPrefix] = useState("!");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [prefixStatus, setPrefixStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  async function load() {
    const data = await authFetch(`/bots/${botId}`);
    setBot(data);
    setPrefix(data.prefix ?? "!");
    const logData = await authFetch(`/bots/${botId}/logs?limit=200`);
    setLogs(logData.reverse());
  }

  useEffect(() => {
    if (botId) {
      load().catch(() => undefined);
    }
  }, [botId]);

  useEffect(() => {
    if (!botId) return;
    const token = getToken();
    if (!token) return;
    const es = new EventSource(`${API_URL}/bots/${botId}/log-stream?token=${token}`);
    es.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setLogs((prev) => [...prev.slice(-199), parsed]);
    };
    return () => es.close();
  }, [botId]);

  async function startBot() {
    setIsStarting(true);
    try {
      await authFetch(`/bots/${botId}/start`, { method: "POST" });
      await load();
    } finally {
      setIsStarting(false);
    }
  }

  async function stopBot() {
    setIsStopping(true);
    try {
      await authFetch(`/bots/${botId}/stop`, { method: "POST" });
      await load();
    } finally {
      setIsStopping(false);
    }
  }

  async function updateBotToken() {
    if (!newToken.trim()) {
      setSaveStatus("Please enter a token first.");
      return;
    }
    try {
      await authFetch(`/bots/${botId}`, {
        method: "PATCH",
        body: JSON.stringify({ token: newToken.trim() })
      });
      setNewToken("");
      setSaveStatus("Token updated successfully.");
      await load();
    } catch (error: any) {
      setSaveStatus(error?.message ?? "Failed to update token.");
    }
  }

  async function updatePrefix() {
    const value = prefix.trim();
    if (!value) {
      setPrefixStatus("Prefix cannot be empty.");
      return;
    }
    try {
      await authFetch(`/bots/${botId}`, {
        method: "PATCH",
        body: JSON.stringify({ prefix: value })
      });
      setPrefixStatus("Prefix updated.");
      await load();
    } catch (error: any) {
      setPrefixStatus(error?.message ?? "Failed to update prefix.");
    }
  }

  async function deleteBot() {
    const confirmed = window.confirm("Delete this bot permanently? This also removes commands, versions, logs and variables.");
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteStatus(null);
    try {
      await authFetch(`/bots/${botId}`, { method: "DELETE" });
      router.push("/bots");
    } catch (error: any) {
      setDeleteStatus(error?.message ?? "Failed to delete bot.");
      setIsDeleting(false);
    }
  }

  const heartbeat = useMemo(() => {
    if (!bot?.lastHeartbeat) return "n/a";
    const date = new Date(bot.lastHeartbeat);
    if (Number.isNaN(date.getTime())) return "n/a";
    return date.toLocaleString();
  }, [bot?.lastHeartbeat]);

  const isRunning = bot?.status === "running";

  return (
    <div className="space-y-4">
      <section className="dash-panel dash-animate-in p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="dash-subtitle">Bot Overview</p>
            <h2 className="dash-title">{bot?.name ?? "Bot"}</h2>
            <p className="mt-1 text-sm dash-muted">{bot?.description || "No description set."}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className={statusTone(bot?.status)}>{bot?.status ?? "loading"}</Badge>
              <Badge className="border-white/20 bg-white/10 text-fog/70">ID: {bot?.id ?? "-"}</Badge>
              <Badge className="border-white/20 bg-white/10 text-fog/70">Prefix: {bot?.prefix ?? "!"}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/bots">Back to Bots</a>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Status</p>
            <p className="mt-1 text-sm text-fog">{bot?.status ?? "unknown"}</p>
          </div>
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Last Heartbeat</p>
            <p className="mt-1 text-sm text-fog">{heartbeat}</p>
          </div>
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Test Guild</p>
            <p className="mt-1 text-sm text-fog">{bot?.testGuildId || "not configured"}</p>
          </div>
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Log Entries</p>
            <p className="mt-1 text-sm text-fog">{logs.length}</p>
          </div>
        </div>

        {deleteStatus && <p className="mt-3 text-xs text-rose-200">{deleteStatus}</p>}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "70ms" }}>
          <div className="mb-3">
            <p className="dash-subtitle">Control</p>
            <h3 className="text-xl font-display">Runtime Actions</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={startBot} disabled={isRunning || isStarting}>
              {isStarting ? "Starting..." : "Start"}
            </Button>
            <Button variant="ghost" size="sm" onClick={stopBot} disabled={!isRunning || isStopping}>
              {isStopping ? "Stopping..." : "Stop"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/bots/${botId}/commands`}>Manage Commands</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/bots/${botId}/events`}>Manage Events</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="border border-rose-300/25 text-rose-200 hover:bg-rose-500/10"
              onClick={deleteBot}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Bot"}
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs dash-muted">
            Start and stop affect runner connectivity and command/event execution immediately.
          </div>
        </section>

        <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "120ms" }}>
          <div className="mb-3">
            <p className="dash-subtitle">Security</p>
            <h3 className="text-xl font-display">Rotate Bot Token</h3>
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              value={newToken}
              onChange={(event) => setNewToken(event.target.value)}
              placeholder="Paste new bot token"
            />
            <Button variant="outline" size="sm" onClick={updateBotToken}>
              Save Token
            </Button>
          </div>
          {saveStatus && <p className="mt-2 text-xs dash-muted">{saveStatus}</p>}
        </section>
      </div>

      <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "140ms" }}>
        <div className="mb-3">
          <p className="dash-subtitle">Commands</p>
          <h3 className="text-xl font-display">Prefix Settings</h3>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            placeholder="!"
            className="max-w-[240px]"
          />
          <Button variant="outline" size="sm" onClick={updatePrefix}>
            Save Prefix
          </Button>
        </div>
        <p className="mt-2 text-xs dash-muted">
          Prefix commands run when message starts with <code>{prefix || "!"}</code> followed by the command name.
        </p>
        {prefixStatus && <p className="mt-1 text-xs dash-muted">{prefixStatus}</p>}
      </section>

      <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "180ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="dash-subtitle">Runtime</p>
            <h3 className="text-xl font-display">Live Logs</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => load().catch(() => undefined)}>
            Refresh
          </Button>
        </div>
        <div className="scroll-area max-h-[420px] space-y-2 overflow-auto text-xs">
          {logs.map((log, index) => (
            <div
              key={log.id ?? `${log.ts}-${index}`}
              className="dash-panel-soft motion-soft hover:border-white/20 p-2"
            >
              <span className="mr-2 text-fog/40">{new Date(log.ts).toLocaleTimeString()}</span>
              <span className="uppercase text-amber-200">{log.level}</span>
              <span className="ml-2 text-fog/80">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="dash-muted">No logs yet.</p>}
        </div>
      </section>
    </div>
  );
}
