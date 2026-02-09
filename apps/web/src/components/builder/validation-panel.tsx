import { Badge } from "@/components/ui/badge";

export interface ValidationIssue {
  message: string;
  level: "error" | "warning";
  nodeId?: string;
}

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-fog/50">No validation issues.</p>;
  }

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <div key={`${issue.nodeId ?? "global"}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <Badge className={issue.level === "error" ? "bg-ember/20 text-ember" : "bg-sky/20 text-sky"}>
              {issue.level}
            </Badge>
            <p className="text-sm text-fog">{issue.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
