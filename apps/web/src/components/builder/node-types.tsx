import { Handle, NodeProps, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { formatEventTypeLabel } from "@/lib/event-types";

function NodeShell({ title, subtitle, children, selected }: { title: string; subtitle?: string; children?: React.ReactNode; selected?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-fog shadow",
        selected && "border-ember shadow-glow"
      )}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-fog/50">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-fog/80">{subtitle}</p>}
      {children}
    </div>
  );
}

export function DefaultNode(props: NodeProps) {
  const { data, selected } = props;
  const buttons = Array.isArray(data.buttons) ? data.buttons : [];
  const selectMenus = Array.isArray((data as any).selectMenus) ? (data as any).selectMenus : [];
  const actionButtons = buttons.filter((btn: any) => String(btn?.style ?? "").toUpperCase() !== "LINK");
  const selectOptions = selectMenus.flatMap((menu: any) =>
    (Array.isArray(menu?.options) ? menu.options : []).map((option: any) => ({
      menuId: menu.id,
      optionId: option.id,
      label: option.label
    }))
  );
  const hideButtons = Boolean((data as any)?.hideButtonHandles);
  const hideSelects = Boolean((data as any)?.hideSelectHandles);
  const interactiveCount = (!hideButtons ? actionButtons.length : 0) + (!hideSelects ? selectOptions.length : 0);
  return (
    <NodeShell title={data.label ?? data.type} subtitle={data.summary} selected={selected}>
      <Handle type="target" position={Position.Top} id="in" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="next"
        style={interactiveCount > 0 ? { left: 176 } : undefined}
      />
      {!hideButtons && actionButtons.map((button: any, index: number) => (
        <Handle
          key={button.id ?? index}
          type="source"
          position={Position.Bottom}
          id={`button:${button.id ?? index}`}
          style={{ left: 24 + index * 24 }}
        />
      ))}
      {!hideSelects && selectOptions.map((option: any, index: number) => (
        <Handle
          key={`${option.menuId}:${option.optionId}:${index}`}
          type="source"
          position={Position.Bottom}
          id={`select:${option.menuId}:${option.optionId}`}
          style={{ left: 24 + (actionButtons.length + index) * 24 }}
        />
      ))}
    </NodeShell>
  );
}

export function TriggerNode(props: NodeProps) {
  const { data, selected } = props;
  const subtitle = data.commandName ?? (data.eventType ? formatEventTypeLabel(data.eventType) : data.summary ?? "");
  return (
    <NodeShell title="Trigger" subtitle={subtitle} selected={selected}>
      <Handle type="source" position={Position.Bottom} id="next" />
    </NodeShell>
  );
}

export function StopNode(props: NodeProps) {
  const { selected } = props;
  return (
    <NodeShell title="Stop" subtitle="End workflow" selected={selected}>
      <Handle type="target" position={Position.Top} id="in" />
    </NodeShell>
  );
}

export function IfElseNode(props: NodeProps) {
  const { data, selected } = props;
  const customLabel =
    typeof data.label === "string" && !["IfElse", "If / Else"].includes(data.label)
      ? data.label
      : undefined;
  return (
    <NodeShell title={customLabel ?? "If / Else"} subtitle={data.summary ?? "Condition"} selected={selected}>
      <Handle type="target" position={Position.Top} id="in" />
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em]">
        <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-emerald-100">
          True
        </span>
        <span className="rounded-full border border-rose-300/40 bg-rose-300/10 px-2 py-0.5 text-rose-100">
          False
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: "26%" }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: "74%" }} />
    </NodeShell>
  );
}

export function SwitchNode(props: NodeProps) {
  const { data, selected } = props;
  const cases = data.cases ?? [];
  return (
    <NodeShell title="Switch" subtitle={data.expression ?? "Expression"} selected={selected}>
      <Handle type="target" position={Position.Top} id="in" />
      {cases.map((item: any, index: number) => (
        <Handle
          key={item.value ?? index}
          type="source"
          position={Position.Bottom}
          id={`case:${item.value ?? index}`}
          style={{ left: 24 + index * 26 }}
        />
      ))}
      <Handle type="source" position={Position.Bottom} id="default" style={{ right: 16 }} />
    </NodeShell>
  );
}

export function LoopNode(props: NodeProps) {
  const { data, selected } = props;
  return (
    <NodeShell title="Loop" subtitle={data.itemVar ? `${data.itemVar} in list` : "Loop"} selected={selected}>
      <Handle type="target" position={Position.Top} id="in" style={{ left: 60 }} />
      <Handle type="target" position={Position.Top} id="continue" style={{ left: 140 }} />
      <Handle type="source" position={Position.Bottom} id="loop" style={{ left: 60 }} />
      <Handle type="source" position={Position.Bottom} id="done" style={{ left: 140 }} />
    </NodeShell>
  );
}

export function HttpNode(props: NodeProps) {
  const { data, selected } = props;
  return (
    <NodeShell title="HTTP" subtitle={data.url ?? "Request"} selected={selected}>
      <Handle type="target" position={Position.Top} id="in" />
      <Handle type="source" position={Position.Bottom} id="success" style={{ left: 60 }} />
      <Handle type="source" position={Position.Bottom} id="failure" style={{ left: 140 }} />
    </NodeShell>
  );
}

export function ButtonProxyNode(props: NodeProps) {
  const { data, selected } = props;
  const style = String(data.style ?? "SECONDARY").toUpperCase();
  const accent =
    style === "PRIMARY"
      ? "border-ember/60 text-ember"
      : style === "SUCCESS"
      ? "border-emerald-400/50 text-emerald-200"
      : style === "DANGER"
      ? "border-rose-400/50 text-rose-200"
      : style === "LINK"
      ? "border-sky/40 text-sky/80"
      : "border-white/20 text-fog/80";

  return (
    <div
      className={cn(
        "min-w-[140px] rounded-2xl border bg-white/5 px-3 py-2 text-xs shadow",
        accent,
        selected && "shadow-glow"
      )}
    >
      <Handle type="target" position={Position.Top} id="in" isConnectable={false} />
      <p className="text-[10px] uppercase tracking-[0.25em] text-fog/50">Button</p>
      <p className="mt-1 text-sm text-fog">{data.label ?? "Button"}</p>
      <Handle type="source" position={Position.Bottom} id="next" />
    </div>
  );
}

export function SelectOptionProxyNode(props: NodeProps) {
  const { data, selected } = props;
  return (
    <div
      className={cn(
        "min-w-[160px] rounded-2xl border border-sky/30 bg-sky/10 px-3 py-2 text-xs text-fog shadow",
        selected && "shadow-glow"
      )}
    >
      <Handle type="target" position={Position.Top} id="in" isConnectable={false} />
      <p className="text-[10px] uppercase tracking-[0.25em] text-fog/50">Select Option</p>
      <p className="mt-1 text-sm text-fog">{data.optionLabel ?? data.optionValue ?? "Option"}</p>
      <Handle type="source" position={Position.Bottom} id="next" />
    </div>
  );
}

export const nodeTypes = {
  ButtonProxy: ButtonProxyNode,
  SelectOptionProxy: SelectOptionProxyNode,
  SlashCommandTrigger: TriggerNode,
  MessageCreateTrigger: TriggerNode,
  ReplyMessage: DefaultNode,
  SendChannelMessage: DefaultNode,
  SendDM: DefaultNode,
  EmbedMessage: DefaultNode,
  IfElse: IfElseNode,
  SwitchCase: SwitchNode,
  Loop: LoopNode,
  SetVariable: DefaultNode,
  GetPersistentVariable: DefaultNode,
  SetPersistentVariable: DefaultNode,
  Delay: DefaultNode,
  HttpRequest: HttpNode,
  AddRole: DefaultNode,
  RemoveRole: DefaultNode,
  Logger: DefaultNode,
  Stop: StopNode
};
