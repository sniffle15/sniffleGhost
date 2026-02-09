"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface Bot {
  id: string;
  name: string;
  description?: string;
  prefix?: string;
  status: string;
}

interface BotForm {
  name: string;
  description?: string;
  applicationId: string;
  token: string;
  testGuildId?: string;
  prefix: string;
}

function statusTone(status: string) {
  if (status === "running") return "bg-emerald-500/20 text-emerald-200 border-emerald-300/30";
  if (status === "starting") return "bg-amber-500/20 text-amber-200 border-amber-300/30";
  if (status === "error") return "bg-rose-500/20 text-rose-200 border-rose-300/30";
  return "bg-white/10 text-fog/70 border-white/20";
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<BotForm>({
    defaultValues: { prefix: "!" }
  });

  async function load() {
    const data = await authFetch("/bots");
    setBots(data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreateOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [createOpen]);

  async function onSubmit(values: BotForm, event?: React.BaseSyntheticEvent) {
    setError(null);
    const form = event?.target as HTMLFormElement | undefined;
    const data = form ? new FormData(form) : null;
    const payload = {
      name: values.name ?? (data?.get("name")?.toString() ?? ""),
      description: values.description ?? (data?.get("description")?.toString() ?? ""),
      applicationId: values.applicationId ?? (data?.get("applicationId")?.toString() ?? ""),
      token: values.token ?? (data?.get("token")?.toString() ?? ""),
      testGuildId: values.testGuildId ?? (data?.get("testGuildId")?.toString() ?? ""),
      prefix: values.prefix ?? (data?.get("prefix")?.toString() ?? "!")
    };

    if (!payload.name || !payload.applicationId || !payload.token) {
      setError("Bitte Name, Application ID und Token ausfuellen.");
      return;
    }

    try {
      await authFetch("/bots", { method: "POST", body: JSON.stringify(payload) });
      reset({ prefix: "!" });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create bot");
    }
  }

  async function deleteBot(botId: string) {
    const confirmed = window.confirm("Delete this bot permanently?");
    if (!confirmed) return;
    try {
      await authFetch(`/bots/${botId}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete bot");
    }
  }

  const filteredBots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter((bot) => bot.name.toLowerCase().includes(q) || (bot.description ?? "").toLowerCase().includes(q));
  }, [bots, query]);

  const runningBots = bots.filter((bot) => bot.status === "running").length;
  const startingBots = bots.filter((bot) => bot.status === "starting").length;

  return (
    <div className="space-y-4">
      <section className="dash-panel dash-animate-in p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="dash-subtitle">Bot Hosting</p>
            <h2 className="dash-title">Fleet Control Center</h2>
            <p className="mt-1 text-sm dash-muted">Manage hosted bots, runtime health and command workspaces.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/settings">Docs</a>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create Bot
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Total Bots</p>
            <p className="mt-1 text-2xl font-display">{bots.length}</p>
          </div>
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Running</p>
            <p className="mt-1 text-2xl font-display text-emerald-200">{runningBots}</p>
          </div>
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Starting</p>
            <p className="mt-1 text-2xl font-display text-amber-200">{startingBots}</p>
          </div>
          <div className="dash-panel-soft motion-soft dash-hover-lift p-3">
            <p className="dash-subtitle">Offline</p>
            <p className="mt-1 text-2xl font-display">{Math.max(0, bots.length - runningBots)}</p>
          </div>
        </div>
      </section>

      <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="dash-subtitle">Fleet</p>
            <h3 className="text-2xl font-display">Active Bots</h3>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by bot name"
              className="h-10 w-52 bg-white/5"
            />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create Bot
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredBots.map((bot, index) => (
            <article
              key={bot.id}
              className="dash-panel-soft motion-soft dash-hover-lift dash-animate-in flex flex-wrap items-center justify-between gap-4 p-3"
              style={{ animationDelay: `${120 + index * 30}ms` }}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-fog">{bot.name}</p>
                <p className="truncate text-xs dash-muted">{bot.description || "No description set."}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusTone(bot.status)}>{bot.status}</Badge>
                <Badge className="bg-white/10 text-fog/70 border-white/20">Prefix {bot.prefix ?? "!"}</Badge>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/bots/${bot.id}`}>Open</a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-rose-300/25 text-rose-200 hover:bg-rose-500/10"
                  onClick={() => deleteBot(bot.id)}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}

          {filteredBots.length === 0 && (
            <div className="dash-panel-soft p-8 text-center">
              <p className="text-base text-fog/80">No bots found.</p>
              <p className="mt-1 text-sm dash-muted">Create your first bot to start building commands and events.</p>
              <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
                Create Bot
              </Button>
            </div>
          )}
        </div>
      </section>

      {mounted && createOpen
        ? createPortal(
            <div className="modal-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
              <div className="modal-panel w-full max-w-2xl dash-panel p-5" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="dash-subtitle">Create</p>
                    <h3 className="text-2xl font-display">New Bot</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                    Close
                  </Button>
                </div>

                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  {error && <p className="text-sm text-rose-200">{error}</p>}
                  <Input placeholder="Bot name" {...register("name", { required: true })} />
                  {formState.errors.name && <p className="text-xs text-rose-200">Name required</p>}
                  <Textarea placeholder="Description" {...register("description")} />
                  <Input placeholder="Discord Application ID" {...register("applicationId", { required: true })} />
                  {formState.errors.applicationId && <p className="text-xs text-rose-200">Application ID required</p>}
                  <Input placeholder="Bot token" {...register("token", { required: true })} />
                  {formState.errors.token && <p className="text-xs text-rose-200">Token required</p>}
                  <Input placeholder="Prefix (e.g. !)" {...register("prefix", { required: true })} />
                  <Input placeholder="Test Guild ID (optional)" {...register("testGuildId")} />
                  <div className="pt-1">
                    <Button type="submit" className="w-full">
                      Save Bot
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
