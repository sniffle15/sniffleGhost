"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Builder } from "@/components/builder/builder";
import { authFetch } from "@/lib/auth";

export default function BuilderPage() {
  const params = useSearchParams();
  const routeParams = useParams();
  const router = useRouter();
  const versionId = params.get("version") ?? "";
  const [workflow, setWorkflow] = useState<any>(null);
  const botId = routeParams.botId as string;
  const commandId = routeParams.commandId as string;

  useEffect(() => {
    if (!versionId) return;
    authFetch(`/versions/${versionId}`).then((data) => {
      setWorkflow(data.workflowJson);
    });
  }, [versionId]);

  if (!versionId) {
    return (
      <div className="fixed inset-0 z-[90] grid-bg bg-ink/95">
        <div className="grid h-full w-full place-items-center p-6">
          <button
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-fog/80 hover:bg-white/10"
            onClick={() => router.push(`/bots/${botId}/commands/${commandId}`)}
          >
            No version selected. Back to command.
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] grid-bg bg-ink/95">
      <div className="h-full w-full p-2 sm:p-3">
        <Builder
          versionId={versionId}
          initialWorkflow={workflow}
          onClose={() => router.push(`/bots/${botId}/commands/${commandId}`)}
        />
      </div>
    </div>
  );
}
