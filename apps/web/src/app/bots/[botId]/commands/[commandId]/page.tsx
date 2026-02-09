"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

export default function CommandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.botId as string;
  const commandId = params.commandId as string;
  const [command, setCommand] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    const data = await authFetch(`/commands/${commandId}`);
    const versionData = await authFetch(`/commands/${commandId}/versions`);
    setCommand(data);
    setVersions(versionData);
  }

  useEffect(() => {
    if (commandId) {
      load().catch(() => undefined);
    }
  }, [commandId]);

  async function createVersion() {
    await authFetch(`/commands/${commandId}/versions`, { method: "POST", body: JSON.stringify({}) });
    await load();
  }

  async function deleteCommand() {
    const confirmed = window.confirm("Delete this command permanently? All versions are removed.");
    if (!confirmed) return;
    setDeleteStatus(null);
    setIsDeleting(true);
    try {
      await authFetch(`/commands/${commandId}`, { method: "DELETE" });
      router.push(`/bots/${botId}/commands`);
    } catch (error: any) {
      setDeleteStatus(error?.message ?? "Failed to delete command.");
      setIsDeleting(false);
    }
  }

  const latest = versions[0];
  const published = useMemo(() => versions.find((version) => version.status === "published"), [versions]);

  return (
    <div className="space-y-4">
      <section className="dash-panel dash-animate-in p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="dash-subtitle">Command</p>
            <h2 className="dash-title">/{command?.name ?? "command"}</h2>
            <p className="mt-1 text-sm dash-muted">{command?.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/10 text-fog/70 border-white/20">{command?.type}</Badge>
            <Badge className="bg-white/10 text-fog/70 border-white/20">Cooldown {command?.cooldownSeconds ?? 0}s</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="border border-rose-300/25 text-rose-200 hover:bg-rose-500/10"
              onClick={deleteCommand}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/bots/${botId}/commands`}>Back</a>
            </Button>
          </div>
        </div>
        {deleteStatus && <p className="mt-3 text-xs text-rose-200">{deleteStatus}</p>}
      </section>

      <section className="dash-panel dash-animate-in p-5" style={{ animationDelay: "80ms" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="dash-subtitle">Versions</p>
            <h3 className="text-2xl font-display">Command Versions</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={createVersion}>New Version</Button>
            {latest && (
              <Button variant="ghost" size="sm" asChild>
                <a href={`/bots/${botId}/commands/${commandId}/builder?version=${latest.id}`}>Edit Latest</a>
              </Button>
            )}
          </div>
        </div>

        {published && (
          <div className="mb-3 rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            Published version: v{published.versionNumber}
          </div>
        )}

        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className="dash-panel-soft motion-soft dash-hover-lift dash-animate-in flex items-center justify-between gap-3 p-3"
              style={{ animationDelay: `${120 + index * 45}ms` }}
            >
              <div>
                <p className="text-sm font-semibold text-fog">v{version.versionNumber}</p>
                <p className="text-xs dash-muted">{version.status}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/bots/${botId}/commands/${commandId}/builder?version=${version.id}`}>Open Builder</a>
              </Button>
            </div>
          ))}
          {versions.length === 0 && <p className="dash-muted text-sm">No versions available.</p>}
        </div>
      </section>
    </div>
  );
}
