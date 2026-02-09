"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface Command {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface BotSummary {
  prefix?: string;
}

interface CommandForm {
  name: string;
  description: string;
  type: "SLASH" | "PREFIX";
  cooldownSeconds?: number;
  options?: string;
}

export default function CommandsPage() {
  const params = useParams();
  const botId = params.botId as string;
  const [commands, setCommands] = useState<Command[]>([]);
  const [botPrefix, setBotPrefix] = useState("!");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<CommandForm>({
    defaultValues: { type: "SLASH" }
  });

  async function load() {
    setIsLoading(true);
    try {
      const [commandsData, botData] = await Promise.all([
        authFetch(`/bots/${botId}/commands`),
        authFetch(`/bots/${botId}`) as Promise<BotSummary>
      ]);
      setCommands(commandsData);
      setBotPrefix((botData?.prefix ?? "!").trim() || "!");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (botId) {
      load().catch(() => undefined);
    }
  }, [botId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCreateOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [createOpen]);

  async function onSubmit(values: CommandForm) {
    setActionError(null);
    let options: any[] = [];
    if (values.options) {
      try {
        options = JSON.parse(values.options);
      } catch {
        options = [];
      }
    }
    try {
      await authFetch(`/bots/${botId}/commands`, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          type: values.type,
          cooldownSeconds: Number(values.cooldownSeconds ?? 0),
          options
        })
      });
      reset({ type: "SLASH" });
      setCreateOpen(false);
      await load();
    } catch (error: any) {
      setActionError(error?.message ?? "Failed to create command.");
    }
  }

  async function deleteCommand(commandId: string) {
    const confirmed = window.confirm("Delete this command permanently? All versions are removed.");
    if (!confirmed) return;
    setActionError(null);
    try {
      await authFetch(`/commands/${commandId}`, { method: "DELETE" });
      await load();
    } catch (error: any) {
      setActionError(error?.message ?? "Failed to delete command.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => cmd.name.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q));
  }, [commands, query]);

  return (
    <div className="space-y-4">
      <section className="dash-panel dash-animate-in p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="dash-subtitle">Custom Commands</p>
            <h2 className="dash-title">Command Manager</h2>
            <p className="mt-1 text-sm dash-muted">Build slash and prefix commands for this bot.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-44 bg-white/5 motion-soft"
            />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create Command
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/bots/${botId}/events`}>Events</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/bots/${botId}`}>Back</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "70ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="dash-subtitle">Slash Commands</p>
            <h3 className="text-2xl font-display">Active Commands</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/10 text-fog/70 border-white/20">{filtered.length} entries</Badge>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create Command
            </Button>
          </div>
        </div>

        {actionError && <p className="mb-3 text-xs text-rose-200">{actionError}</p>}

        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`command-skeleton-${index}`}
                className="dash-panel-soft dash-animate-in p-3"
                style={{ animationDelay: `${120 + index * 45}ms` }}
              >
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-3 w-60 animate-pulse rounded bg-white/5" />
              </div>
            ))}
          {filtered.map((cmd, index) => (
            <div
              key={cmd.id}
              className="dash-panel-soft motion-soft dash-hover-lift dash-animate-in flex items-center justify-between gap-3 p-3"
              style={{ animationDelay: `${140 + index * 45}ms` }}
            >
              <div>
                  <p className="text-sm font-semibold text-fog">
                    {cmd.type === "PREFIX"
                      ? `${botPrefix}${cmd.name.replace(/^\/+/, "")}`
                      : `/${cmd.name.replace(/^\/+/, "")}`}
                  </p>
                  <p className="text-xs dash-muted">{cmd.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/10 text-fog/70 border-white/20">{cmd.type}</Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/bots/${botId}/commands/${cmd.id}`}>Open</a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-rose-300/25 text-rose-200 hover:bg-rose-500/10"
                    onClick={() => deleteCommand(cmd.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="dash-panel-soft dash-animate-in p-6 text-center" style={{ animationDelay: "140ms" }}>
              <p className="dash-muted text-sm">No commands yet.</p>
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
                    <h3 className="text-2xl font-display">New Command</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                    Close
                  </Button>
                </div>

                {actionError && <p className="mb-3 text-xs text-rose-200">{actionError}</p>}

                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <Input placeholder="Command name" {...register("name", { required: true })} />
                  <Input placeholder="Description" {...register("description", { required: true })} />
                  <Select {...register("type")}>
                    <option value="SLASH">Slash Command</option>
                    <option value="PREFIX">Prefix Command</option>
                  </Select>
                  <Input placeholder="Cooldown seconds" type="number" {...register("cooldownSeconds")} />
                  <Textarea placeholder='Options JSON e.g. [{"name":"count","type":"int"}]' {...register("options")} />
                  <Button type="submit" className="w-full">
                    Create
                  </Button>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
