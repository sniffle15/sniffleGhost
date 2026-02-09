import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Node } from "reactflow";
import { Input } from "@/components/ui/input";
import { VariableInput, VariableTextarea } from "./variable-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useBuilderStore } from "./store";
import { EVENT_TYPE_OPTIONS } from "@/lib/event-types";

const fieldConfig: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "number" }>> = {
  SlashCommandTrigger: [{ key: "commandName", label: "Command Name", type: "text" }],
  MessageCreateTrigger: [{ key: "eventType", label: "Event Type", type: "text" }],
  ReplyMessage: [{ key: "template", label: "Message", type: "textarea" }],
  SendChannelMessage: [
    { key: "channelId", label: "Channel ID", type: "text" },
    { key: "template", label: "Message", type: "textarea" }
  ],
  SendDM: [
    { key: "targetUserId", label: "Target User ID (optional)", type: "text" },
    { key: "template", label: "Message", type: "textarea" }
  ],
  EmbedMessage: [],
  Loop: [
    { key: "listExpression", label: "List Expression", type: "text" },
    { key: "itemVar", label: "Item Variable", type: "text" }
  ],
  SetVariable: [
    { key: "name", label: "Variable Name", type: "text" },
    { key: "value", label: "Value", type: "text" }
  ],
  GetPersistentVariable: [
    { key: "key", label: "Key", type: "text" },
    { key: "scope", label: "Scope (user/guild)", type: "text" },
    { key: "assignTo", label: "Assign To", type: "text" }
  ],
  SetPersistentVariable: [
    { key: "key", label: "Key", type: "text" },
    { key: "scope", label: "Scope (user/guild)", type: "text" },
    { key: "value", label: "Value", type: "text" }
  ],
  Delay: [{ key: "ms", label: "Delay (ms)", type: "number" }],
  HttpRequest: [
    { key: "method", label: "Method", type: "text" },
    { key: "url", label: "URL", type: "text" },
    { key: "responseVar", label: "Response Var", type: "text" }
  ],
  AddRole: [
    { key: "roleId", label: "Role ID", type: "text" },
    { key: "targetUserId", label: "Target User ID (optional)", type: "text" },
    { key: "reason", label: "Reason (optional)", type: "text" }
  ],
  RemoveRole: [
    { key: "roleId", label: "Role ID", type: "text" },
    { key: "targetUserId", label: "Target User ID (optional)", type: "text" },
    { key: "reason", label: "Reason (optional)", type: "text" }
  ],
  Logger: [{ key: "message", label: "Message", type: "text" }],
  Stop: []
};

const fieldSelectOptions: Record<string, Array<{ value: string; label: string }>> = {
  eventType: [...EVENT_TYPE_OPTIONS],
  scope: [
    { value: "user", label: "User" },
    { value: "guild", label: "Guild" }
  ],
  method: [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "PATCH", label: "PATCH" },
    { value: "DELETE", label: "DELETE" }
  ],
  level: [
    { value: "info", label: "Info" },
    { value: "warn", label: "Warn" },
    { value: "error", label: "Error" }
  ]
};

const fieldPlaceholders: Record<string, string> = {
  targetUserId: "Leave empty to use command user",
  roleId: "123456789012345678 or {{vars.roleId}}",
  reason: "Optional moderation reason"
};

const buttonEnabledNodes = new Set(["ReplyMessage", "SendChannelMessage", "SendDM", "EmbedMessage"]);
const selectMenuEnabledNodes = new Set(["ReplyMessage", "SendChannelMessage", "SendDM", "EmbedMessage"]);

type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "lt"
  | "in"
  | "hasRole"
  | "hasPermission";

type OperandMode = "variable" | "value";

interface ConditionRuleForm {
  id: string;
  left: string;
  leftMode: OperandMode;
  operator: ConditionOperator;
  right: string;
  rightMode: OperandMode;
}

interface ConditionGroupForm {
  id: string;
  op: "AND" | "OR";
  rules: Array<ConditionRuleForm | ConditionGroupForm>;
}

const CONDITION_OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string }> = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "in", label: "In List" },
  { value: "hasRole", label: "Has Role" },
  { value: "hasPermission", label: "Has Permission" }
];

const OPERATOR_PREVIEW: Record<ConditionOperator, string> = {
  equals: "==",
  notEquals: "!=",
  contains: "contains",
  startsWith: "startsWith",
  endsWith: "endsWith",
  gt: ">",
  lt: "<",
  in: "in",
  hasRole: "hasRole",
  hasPermission: "hasPermission"
};

function createConditionId(prefix: "rule" | "group"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function isConditionGroup(entry: ConditionRuleForm | ConditionGroupForm | any): entry is ConditionGroupForm {
  return Boolean(entry && typeof entry === "object" && Array.isArray(entry.rules));
}

function inferOperandMode(rawValue: unknown): OperandMode {
  const value = String(rawValue ?? "").trim();
  if (!value) return "variable";
  const variablePrefixes = ["user.", "guild.", "channel.", "options.", "memberRoles", "vars.", "variables."];
  if (value.includes("{{") || value.startsWith("{")) return "variable";
  if (variablePrefixes.some((prefix) => value.startsWith(prefix))) return "variable";
  return "value";
}

function createDefaultConditionRule(): ConditionRuleForm {
  return {
    id: createConditionId("rule"),
    left: "",
    leftMode: "variable",
    operator: "equals",
    right: "",
    rightMode: "value"
  };
}

function createDefaultConditionGroup(): ConditionGroupForm {
  return {
    id: createConditionId("group"),
    op: "AND",
    rules: [createDefaultConditionRule()]
  };
}

function normalizeConditionRule(rule: any): ConditionRuleForm {
  return {
    id: typeof rule?.id === "string" && rule.id ? rule.id : createConditionId("rule"),
    left: typeof rule?.left === "string" ? rule.left : "",
    leftMode: rule?.leftMode === "value" ? "value" : inferOperandMode(rule?.left),
    operator: CONDITION_OPERATOR_OPTIONS.some((item) => item.value === rule?.operator)
      ? rule.operator
      : "equals",
    right: typeof rule?.right === "string" ? rule.right : "",
    rightMode: rule?.rightMode === "variable" ? "variable" : inferOperandMode(rule?.right)
  };
}

function normalizeConditionGroup(group: any): ConditionGroupForm {
  const rules = Array.isArray(group?.rules) ? group.rules : [];
  const normalizedRules = rules.map((rule: any) =>
    isConditionGroup(rule) ? normalizeConditionGroup(rule) : normalizeConditionRule(rule)
  );
  return {
    id: typeof group?.id === "string" && group.id ? group.id : createConditionId("group"),
    op: group?.op === "OR" ? "OR" : "AND",
    rules: normalizedRules.length > 0 ? normalizedRules : [createDefaultConditionRule()]
  };
}

function updateConditionGroupAtPath(
  group: ConditionGroupForm,
  path: number[],
  updater: (target: ConditionGroupForm) => ConditionGroupForm
): ConditionGroupForm {
  if (path.length === 0) {
    return updater(group);
  }
  const [index, ...rest] = path;
  const entry = group.rules[index];
  if (!isConditionGroup(entry)) {
    return group;
  }
  const nextRules = [...group.rules];
  nextRules[index] = updateConditionGroupAtPath(entry, rest, updater);
  return { ...group, rules: nextRules };
}

function formatConditionRulePreview(rule: ConditionRuleForm): string {
  const left = rule.leftMode === "value" ? `"${rule.left || "..."}"` : rule.left || "var";
  const right = rule.rightMode === "value" ? `"${rule.right || "..."}"` : rule.right || "value";
  return `${left} ${OPERATOR_PREVIEW[rule.operator]} ${right}`;
}

function formatConditionGroupPreview(group: ConditionGroupForm): string {
  const parts = group.rules.map((entry) =>
    isConditionGroup(entry) ? `(${formatConditionGroupPreview(entry)})` : formatConditionRulePreview(entry)
  );
  if (parts.length === 0) return "Condition";
  return parts.join(` ${group.op} `);
}

const PREVIEW_TOKEN_MAP: Record<string, string> = {
  "{user}": "@sniffle",
  "{user_name}": "sniffle",
  "{user_id}": "123456789012345678",
  "{user_tag}": "sniffle#1234",
  "{channel}": "#general",
  "{channel_name}": "general",
  "{channel_id}": "123456789012345678",
  "{server}": "sniffleGhost",
  "{server_id}": "123456789012345678",
  "{server_icon}": "https://cdn.discordapp.com/embed/avatars/0.png"
};

function applyPreviewTokens(rawValue: unknown): string {
  let value = String(rawValue ?? "");
  for (const [token, replacement] of Object.entries(PREVIEW_TOKEN_MAP)) {
    value = value.split(token).join(replacement);
  }
  value = value.replace(/\{vars\.([a-zA-Z0-9_.$-]+)\}/g, (_full, name: string) => `[var:${name}]`);
  return value;
}

function previewText(rawValue: unknown, fallback = ""): string {
  const value = applyPreviewTokens(rawValue).trim();
  return value || fallback;
}

function previewUrl(rawValue: unknown): string | undefined {
  const value = previewText(rawValue).trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return undefined;
}

function previewColor(rawValue: unknown): string {
  const value = String(rawValue ?? "").trim();
  if (/^#[0-9a-fA-F]{3}$/.test(value) || /^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return "#5865F2";
}

function previewTimestamp(rawValue: unknown): string | null {
  const value = String(rawValue ?? "").trim();
  if (!value) return null;
  if (value.toLowerCase() === "now") {
    return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(parsed);
  }
  return value;
}

export function Inspector() {
  const { nodes, edges, selectedNodeId, setNodes, setEdges } = useBuilderStore();
  const selected = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const [showEmbedEditor, setShowEmbedEditor] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!selected || selected.type !== "EmbedMessage") {
      setShowEmbedEditor(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!showEmbedEditor) {
      delete (document.body as any).dataset.modalOpen;
      return;
    }
    (document.body as any).dataset.modalOpen = "1";
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowEmbedEditor(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      delete (document.body as any).dataset.modalOpen;
    };
  }, [showEmbedEditor]);

  if (!selected) {
    return <p className="text-sm text-fog/50">Select a node to edit its properties.</p>;
  }

  const selectedNode = selected as Node;
  const fields = fieldConfig[selectedNode.type as string] ?? [];
  const conditionGroup = selectedNode.type === "IfElse"
    ? normalizeConditionGroup((selectedNode.data as any)?.conditions)
    : null;

  function updateNodeData(patch: Record<string, unknown>) {
    const updated: Node = {
      ...selectedNode,
      data: {
        ...(selectedNode.data as any),
        ...patch
      }
    };
    setNodes(nodes.map((node) => (node.id === selectedNode.id ? updated : node)));
  }

  function updateField(key: string, value: any) {
    updateNodeData({ [key]: value });
  }

  function setConditionGroup(next: ConditionGroupForm) {
    updateNodeData({
      conditions: next,
      summary: formatConditionGroupPreview(next)
    });
  }

  function updateConditionAtPath(
    path: number[],
    updater: (group: ConditionGroupForm) => ConditionGroupForm
  ) {
    if (!conditionGroup) return;
    const next = updateConditionGroupAtPath(conditionGroup, path, updater);
    setConditionGroup(next);
  }

  function updateConditionGroupOperator(path: number[], op: "AND" | "OR") {
    updateConditionAtPath(path, (group) => ({ ...group, op }));
  }

  function addConditionRule(path: number[]) {
    updateConditionAtPath(path, (group) => ({
      ...group,
      rules: [...group.rules, createDefaultConditionRule()]
    }));
  }

  function addConditionSubGroup(path: number[]) {
    updateConditionAtPath(path, (group) => ({
      ...group,
      rules: [...group.rules, createDefaultConditionGroup()]
    }));
  }

  function removeConditionEntry(path: number[], entryIndex: number) {
    updateConditionAtPath(path, (group) => {
      const rules = group.rules.filter((_, index) => index !== entryIndex);
      return {
        ...group,
        rules: rules.length > 0 ? rules : [createDefaultConditionRule()]
      };
    });
  }

  function updateConditionRule(path: number[], entryIndex: number, patch: Partial<ConditionRuleForm>) {
    updateConditionAtPath(path, (group) => {
      const entry = group.rules[entryIndex];
      if (isConditionGroup(entry)) {
        return group;
      }
      const nextRules = [...group.rules];
      nextRules[entryIndex] = { ...entry, ...patch };
      return { ...group, rules: nextRules };
    });
  }

  function resetConditionBuilder() {
    applyIfElsePreset("comparison");
  }

  function updateSwitchCases(value: string) {
    const cases = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ value: line }));
    updateField("cases", cases);
  }

  function updateButtons(next: any[]) {
    const prevButtons = (((selectedNode.data as any)?.buttons ?? []) as any[]);
    const prevIds = prevButtons.map((btn) => String(btn.id ?? ""));
    const nextIds = next.map((btn) => String(btn.id ?? ""));
    const removed = prevIds.filter((id) => id && !nextIds.includes(id));
    if (removed.length > 0) {
      setEdges(
        edges.filter((edge) => {
          if (edge.source !== selectedNode.id) return true;
          const handle = edge.sourceHandle ?? "";
          if (!handle.startsWith("button:")) return true;
          const buttonId = handle.slice("button:".length);
          return !removed.includes(buttonId);
        })
      );
    }
    updateField("buttons", next);
  }

  function flattenSelectHandles(menus: any[]) {
    return menus.flatMap((menu) =>
      (Array.isArray(menu?.options) ? menu.options : []).map((option: any) => `select:${menu.id}:${option.id}`)
    );
  }

  function updateSelectMenus(next: any[]) {
    const prevMenus = (((selectedNode.data as any)?.selectMenus ?? []) as any[]);
    const prevHandles = new Set(flattenSelectHandles(prevMenus));
    const nextHandles = new Set(flattenSelectHandles(next));
    const removedHandles = [...prevHandles].filter((handle) => !nextHandles.has(handle));
    if (removedHandles.length > 0) {
      setEdges(
        edges.filter((edge) => {
          if (edge.source !== selectedNode.id) return true;
          const handle = edge.sourceHandle ?? "";
          if (!handle.startsWith("select:")) return true;
          return !removedHandles.includes(handle);
        })
      );
    }
    updateField("selectMenus", next);
  }

  function addButton() {
    const next = [...(((selectedNode.data as any)?.buttons ?? []) as any[])];
    next.push({
      id: `btn_${Date.now().toString(36)}`,
      label: "Button",
      style: "PRIMARY",
      disabled: false
    });
    updateButtons(next);
  }

  function updateButton(index: number, patch: Record<string, any>) {
    const next = [...(((selectedNode.data as any)?.buttons ?? []) as any[])];
    next[index] = { ...next[index], ...patch };
    updateButtons(next);
  }

  function removeButton(index: number) {
    const next = [...(((selectedNode.data as any)?.buttons ?? []) as any[])];
    next.splice(index, 1);
    updateButtons(next);
  }

  function addSelectMenu() {
    const next = [...(((selectedNode.data as any)?.selectMenus ?? []) as any[])];
    next.push({
      id: `sel_${Date.now().toString(36)}`,
      placeholder: "Choose an option",
      minValues: 1,
      maxValues: 1,
      disabled: false,
      options: [
        {
          id: `opt_${Date.now().toString(36)}`,
          label: "Option 1",
          value: "option_1"
        }
      ]
    });
    updateSelectMenus(next);
  }

  function updateSelectMenu(index: number, patch: Record<string, any>) {
    const next = [...(((selectedNode.data as any)?.selectMenus ?? []) as any[])];
    next[index] = { ...next[index], ...patch };
    updateSelectMenus(next);
  }

  function removeSelectMenu(index: number) {
    const next = [...(((selectedNode.data as any)?.selectMenus ?? []) as any[])];
    next.splice(index, 1);
    updateSelectMenus(next);
  }

  function addSelectOption(menuIndex: number) {
    const next = [...(((selectedNode.data as any)?.selectMenus ?? []) as any[])];
    const menu = { ...next[menuIndex] };
    const options = Array.isArray(menu.options) ? [...menu.options] : [];
    const optionNumber = options.length + 1;
    options.push({
      id: `opt_${Date.now().toString(36)}_${optionNumber}`,
      label: `Option ${optionNumber}`,
      value: `option_${optionNumber}`
    });
    next[menuIndex] = { ...menu, options };
    updateSelectMenus(next);
  }

  function updateSelectOption(menuIndex: number, optionIndex: number, patch: Record<string, any>) {
    const next = [...(((selectedNode.data as any)?.selectMenus ?? []) as any[])];
    const menu = { ...next[menuIndex] };
    const options = Array.isArray(menu.options) ? [...menu.options] : [];
    options[optionIndex] = { ...options[optionIndex], ...patch };
    next[menuIndex] = { ...menu, options };
    updateSelectMenus(next);
  }

  function removeSelectOption(menuIndex: number, optionIndex: number) {
    const next = [...(((selectedNode.data as any)?.selectMenus ?? []) as any[])];
    const menu = { ...next[menuIndex] };
    const options = Array.isArray(menu.options) ? [...menu.options] : [];
    options.splice(optionIndex, 1);
    next[menuIndex] = { ...menu, options };
    updateSelectMenus(next);
  }

  const buttons = (((selectedNode.data as any)?.buttons ?? []) as any[]);
  const selectMenus = (((selectedNode.data as any)?.selectMenus ?? []) as any[]);
  const embedFields = Array.isArray((selectedNode.data as any)?.fields)
    ? (((selectedNode.data as any)?.fields ?? []) as any[])
    : [];
  const embedPreview = {
    title: previewText((selectedNode.data as any)?.title, "Embed title"),
    description: previewText((selectedNode.data as any)?.description, "Embed description"),
    url: previewUrl((selectedNode.data as any)?.url),
    color: previewColor((selectedNode.data as any)?.color),
    authorName: previewText((selectedNode.data as any)?.authorName),
    authorUrl: previewUrl((selectedNode.data as any)?.authorUrl),
    authorIconUrl: previewUrl((selectedNode.data as any)?.authorIconUrl),
    footerText: previewText((selectedNode.data as any)?.footer),
    footerIconUrl: previewUrl((selectedNode.data as any)?.footerIconUrl),
    thumbnailUrl: previewUrl((selectedNode.data as any)?.thumbnailUrl),
    imageUrl: previewUrl((selectedNode.data as any)?.imageUrl),
    timestamp: previewTimestamp((selectedNode.data as any)?.timestamp),
    fields: embedFields
      .map((field) => ({
        name: previewText(field?.name),
        value: previewText(field?.value),
        inline: Boolean(field?.inline)
      }))
      .filter((field) => field.name || field.value)
  };

  const embedPreviewPane = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-fog/60">Live Preview</p>
        <span className="text-[11px] text-fog/50">Discord-style preview</span>
      </div>
      <div className="rounded-2xl bg-[#313338] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#b5bac1]">
          <div className="h-8 w-8 rounded-full bg-[#23a55a]" />
          <span className="font-semibold text-[#f2f3f5]">test1234</span>
          <span className="rounded bg-[#5865f2] px-1 py-[1px] text-[10px] font-bold text-white">APP</span>
          <span>heute um {new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span>
        </div>
        <div className="ml-10 rounded-lg bg-[#2b2d31] p-3" style={{ borderLeft: `4px solid ${embedPreview.color}` }}>
          {(embedPreview.authorName || embedPreview.authorIconUrl) && (
            <div className="mb-2 flex items-center gap-2 text-sm text-[#f2f3f5]">
              {embedPreview.authorIconUrl && (
                <img
                  src={embedPreview.authorIconUrl}
                  alt="Author icon"
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              {embedPreview.authorUrl ? (
                <a href={embedPreview.authorUrl} target="_blank" rel="noreferrer" className="font-semibold underline decoration-dotted">
                  {embedPreview.authorName || "Author"}
                </a>
              ) : (
                <span className="font-semibold">{embedPreview.authorName}</span>
              )}
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {embedPreview.url ? (
                <a href={embedPreview.url} target="_blank" rel="noreferrer" className="block break-words text-xl font-semibold text-[#f2f3f5] underline decoration-dotted">
                  {embedPreview.title}
                </a>
              ) : (
                <p className="break-words text-xl font-semibold text-[#f2f3f5]">{embedPreview.title}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#dbdee1]">{embedPreview.description}</p>
            </div>
            {embedPreview.thumbnailUrl && (
              <img
                src={embedPreview.thumbnailUrl}
                alt="Thumbnail"
                className="h-20 w-20 rounded-md object-cover"
              />
            )}
          </div>
          {embedPreview.fields.length > 0 && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {embedPreview.fields.map((field, index) => (
                <div key={`${field.name}-${index}`} className={field.inline ? "md:col-span-1" : "md:col-span-2"}>
                  <p className="break-words text-sm font-semibold text-[#f2f3f5]">{field.name || "\u200B"}</p>
                  <p className="whitespace-pre-wrap break-words text-sm text-[#dbdee1]">{field.value || "\u200B"}</p>
                </div>
              ))}
            </div>
          )}
          {embedPreview.imageUrl && (
            <img
              src={embedPreview.imageUrl}
              alt="Embed image"
              className="mt-3 max-h-56 w-full rounded-md object-cover"
            />
          )}
          {(embedPreview.footerText || embedPreview.footerIconUrl || embedPreview.timestamp) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#b5bac1]">
              {embedPreview.footerIconUrl && (
                <img
                  src={embedPreview.footerIconUrl}
                  alt="Footer icon"
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              {embedPreview.footerText && <span className="font-semibold">{embedPreview.footerText}</span>}
              {embedPreview.footerText && embedPreview.timestamp && <span>-</span>}
              {embedPreview.timestamp && <span>{embedPreview.timestamp}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ButtonsEditor = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-fog/60">Buttons</p>
        <Button variant="outline" size="sm" onClick={addButton}>
          Add Button
        </Button>
      </div>
      {buttons.length === 0 && <p className="text-xs text-fog/50">No buttons yet.</p>}
      {buttons.map((button, index) => (
        <div key={button.id ?? index} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-fog/60">Button #{index + 1}</p>
            <Button variant="ghost" size="sm" onClick={() => removeButton(index)}>
              Remove
            </Button>
          </div>
          <label className="block space-y-2 text-xs text-fog/60">
            <span>Label</span>
            <VariableInput
              value={button.label ?? ""}
              onValueChange={(value) => updateButton(index, { label: value })}
            />
          </label>
          <label className="block space-y-2 text-xs text-fog/60">
            <span>Style</span>
            <Select
              value={button.style ?? "PRIMARY"}
              onChange={(e) => updateButton(index, { style: e.target.value })}
            >
              <option value="PRIMARY">Primary</option>
              <option value="SECONDARY">Secondary</option>
              <option value="SUCCESS">Success</option>
              <option value="DANGER">Danger</option>
              <option value="LINK">Link</option>
            </Select>
          </label>
          {String(button.style ?? "PRIMARY").toUpperCase() === "LINK" && (
            <label className="block space-y-2 text-xs text-fog/60">
              <span>URL</span>
              <VariableInput
                value={button.url ?? ""}
                onValueChange={(value) => updateButton(index, { url: value })}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-xs text-fog/60">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-white/30 bg-white/10 accent-ember"
              checked={Boolean(button.disabled)}
              onChange={(e) => updateButton(index, { disabled: e.target.checked })}
            />
            Disabled
          </label>
          {String(button.style ?? "PRIMARY").toUpperCase() === "LINK" ? (
            <p className="text-xs text-fog/40">Link buttons open a URL and do not trigger workflow edges.</p>
          ) : (
            <p className="text-xs text-fog/40">Connect this button block to the next node.</p>
          )}
        </div>
      ))}
    </div>
  );

  const SelectMenusEditor = (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-fog/60">Select Menus</p>
        <Button variant="outline" size="sm" onClick={addSelectMenu}>
          Add Menu
        </Button>
      </div>
      {selectMenus.length === 0 && <p className="text-xs text-fog/50">No select menus yet.</p>}
      {selectMenus.map((menu, menuIndex) => (
        <div key={menu.id ?? menuIndex} className="space-y-3 rounded-2xl border border-sky/20 bg-sky/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-fog/70">Menu #{menuIndex + 1}</p>
            <Button variant="ghost" size="sm" onClick={() => removeSelectMenu(menuIndex)}>
              Remove
            </Button>
          </div>
          <label className="block space-y-2 text-xs text-fog/60">
            <span>Placeholder</span>
            <VariableInput
              value={menu.placeholder ?? ""}
              onValueChange={(value) => updateSelectMenu(menuIndex, { placeholder: value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2 text-xs text-fog/60">
              <span>Min</span>
              <Input
                type="number"
                min={0}
                max={25}
                value={Number(menu.minValues ?? 1)}
                onChange={(e) => updateSelectMenu(menuIndex, { minValues: Number(e.target.value) })}
              />
            </label>
            <label className="block space-y-2 text-xs text-fog/60">
              <span>Max</span>
              <Input
                type="number"
                min={1}
                max={25}
                value={Number(menu.maxValues ?? 1)}
                onChange={(e) => updateSelectMenu(menuIndex, { maxValues: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-fog/60">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-white/30 bg-white/10 accent-ember"
              checked={Boolean(menu.disabled)}
              onChange={(e) => updateSelectMenu(menuIndex, { disabled: e.target.checked })}
            />
            Disabled
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-fog/60">Options</p>
              <Button variant="outline" size="sm" onClick={() => addSelectOption(menuIndex)}>
                Add Option
              </Button>
            </div>
            {(!Array.isArray(menu.options) || menu.options.length === 0) && (
              <p className="text-xs text-fog/50">No options yet.</p>
            )}
            {(Array.isArray(menu.options) ? menu.options : []).map((option: any, optionIndex: number) => (
              <div key={option.id ?? optionIndex} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-fog/60">Option #{optionIndex + 1}</p>
                  <Button variant="ghost" size="sm" onClick={() => removeSelectOption(menuIndex, optionIndex)}>
                    Remove
                  </Button>
                </div>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Label</span>
                  <VariableInput
                    value={option.label ?? ""}
                    onValueChange={(value) => updateSelectOption(menuIndex, optionIndex, { label: value })}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Value</span>
                  <VariableInput
                    value={option.value ?? ""}
                    onValueChange={(value) => updateSelectOption(menuIndex, optionIndex, { value })}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Description (optional)</span>
                  <VariableInput
                    value={option.description ?? ""}
                    onValueChange={(value) => updateSelectOption(menuIndex, optionIndex, { description: value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-fog/60">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-white/30 bg-white/10 accent-ember"
                    checked={Boolean(option.default)}
                    onChange={(e) => updateSelectOption(menuIndex, optionIndex, { default: e.target.checked })}
                  />
                  Default option
                </label>
                <p className="text-xs text-fog/40">Connect this option block to the next node.</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  type IfElsePreset = "comparison" | "chance" | "permission" | "role" | "channel" | "user";
  const ifElseRoleUserId = String((selectedNode.data as any)?.roleUserId ?? "").trim();
  const ifElsePrimaryRule =
    (conditionGroup?.rules.find(
      (entry) => !isConditionGroup(entry) && (entry as ConditionRuleForm).operator === "hasRole"
    ) as ConditionRuleForm | undefined) ??
    (conditionGroup?.rules.find((entry) => !isConditionGroup(entry)) as ConditionRuleForm | undefined);
  const ifElsePreset = ((selectedNode.data as any)?.conditionPreset as IfElsePreset | undefined)
    ?? (ifElsePrimaryRule?.operator === "hasRole"
      ? "role"
      : ifElsePrimaryRule?.operator === "hasPermission"
      ? "permission"
      : ifElsePrimaryRule?.left?.includes("random(")
      ? "chance"
      : ifElsePrimaryRule?.left?.startsWith("channel.")
      ? "channel"
      : ifElsePrimaryRule?.left?.startsWith("user.")
      ? "user"
      : "comparison");

  const conditionPreview = conditionGroup ? formatConditionGroupPreview(conditionGroup) : "Condition";

  function buildRoleConditionGroup(roleValue: string, roleUserId: string): ConditionGroupForm {
    const rules: ConditionGroupForm["rules"] = [
      {
        id: createConditionId("rule"),
        left: "memberRoles",
        leftMode: "variable",
        operator: "hasRole",
        right: roleValue,
        rightMode: "value"
      }
    ];
    if (roleUserId.trim()) {
      rules.push({
        id: createConditionId("rule"),
        left: "user.id",
        leftMode: "variable",
        operator: "equals",
        right: roleUserId.trim(),
        rightMode: "value"
      });
    }
    return {
      id: conditionGroup?.id ?? createConditionId("group"),
      op: "AND",
      rules
    };
  }

  function applySimpleIfElse(rulePatch: Partial<ConditionRuleForm>, preset = ifElsePreset) {
    const base = ifElsePrimaryRule ?? createDefaultConditionRule();
    const nextRule: ConditionRuleForm = { ...base, ...rulePatch };
    if (preset === "role") {
      const nextRoleUserId = String((selectedNode.data as any)?.roleUserId ?? "").trim();
      const nextGroup = buildRoleConditionGroup(nextRule.right || "Admin", nextRoleUserId);
      updateNodeData({
        conditionPreset: preset,
        conditions: nextGroup,
        summary: formatConditionGroupPreview(nextGroup),
        roleUserId: nextRoleUserId
      });
      return;
    }
    const nextGroup: ConditionGroupForm = {
      id: conditionGroup?.id ?? createConditionId("group"),
      op: "AND",
      rules: [nextRule]
    };
    updateNodeData({
      conditionPreset: preset,
      conditions: nextGroup,
      summary: formatConditionRulePreview(nextRule),
      roleUserId: ""
    });
  }

  function applyIfElsePreset(preset: IfElsePreset) {
    const presets: Record<IfElsePreset, Partial<ConditionRuleForm>> = {
      comparison: { left: "options.value", operator: "equals", right: "10", leftMode: "variable", rightMode: "value" },
      chance: { left: "{{random(0,100)}}", operator: "lt", right: "10", leftMode: "variable", rightMode: "value" },
      permission: { left: "memberRoles", operator: "hasPermission", right: "Administrator", leftMode: "variable", rightMode: "value" },
      role: { left: "memberRoles", operator: "hasRole", right: "Admin", leftMode: "variable", rightMode: "value" },
      channel: { left: "channel.id", operator: "equals", right: "1234567890", leftMode: "variable", rightMode: "value" },
      user: { left: "user.id", operator: "equals", right: "1234567890", leftMode: "variable", rightMode: "value" }
    };
    if (preset === "role") {
      const existingRole = ifElsePrimaryRule?.right ?? "Admin";
      const existingUserId = String((selectedNode.data as any)?.roleUserId ?? "").trim();
      const nextGroup = buildRoleConditionGroup(existingRole, existingUserId);
      updateNodeData({
        conditionPreset: "role",
        conditions: nextGroup,
        summary: formatConditionGroupPreview(nextGroup),
        roleUserId: existingUserId
      });
      return;
    }
    applySimpleIfElse(presets[preset], preset);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-fog/50">Inspector</p>
        <h3 className="font-display text-lg text-fog">{selected.type}</h3>
      </div>

      {selected.type === "IfElse" && (
        <div className="space-y-3">
          <label className="block space-y-2 text-xs text-fog/60">
            <span>Condition Type</span>
            <Select
              value={ifElsePreset}
              onChange={(event) => applyIfElsePreset(event.target.value as IfElsePreset)}
            >
              <option value="comparison">Comparison Condition</option>
              <option value="chance">Chance Condition</option>
              <option value="permission">Permissions Condition</option>
              <option value="role">Role Condition</option>
              <option value="channel">Channel Condition</option>
              <option value="user">User Condition</option>
            </Select>
          </label>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
            <p className="font-semibold">Condition Preview</p>
            <p className="mt-1 break-words text-emerald-100/90">{conditionPreview || "No condition configured yet."}</p>
          </div>

          {ifElsePreset === "chance" ? (
            <label className="block space-y-2 text-xs text-fog/60">
              <span>Chance (%)</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={Number(ifElsePrimaryRule?.right ?? 10)}
                onChange={(event) => {
                  const clamped = Math.max(0, Math.min(100, Number(event.target.value || 0)));
                  applySimpleIfElse({ left: "{{random(0,100)}}", operator: "lt", right: String(clamped) }, "chance");
                }}
              />
            </label>
          ) : (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <label className="block space-y-2 text-xs text-fog/60">
                <span>Base Value</span>
                {ifElsePreset === "permission" ? (
                  <Select
                    value={ifElsePrimaryRule?.right ?? "Administrator"}
                    onChange={(event) =>
                      applySimpleIfElse({ left: "memberRoles", operator: "hasPermission", right: event.target.value }, "permission")
                    }
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="ManageMessages">Manage Messages</option>
                    <option value="ManageChannels">Manage Channels</option>
                    <option value="KickMembers">Kick Members</option>
                    <option value="BanMembers">Ban Members</option>
                  </Select>
                ) : ifElsePreset === "role" ? (
                  <div className="space-y-2">
                    <VariableInput
                      value={ifElsePrimaryRule?.right ?? "Admin"}
                      onValueChange={(value) =>
                        applySimpleIfElse({ left: "memberRoles", operator: "hasRole", right: value || "Admin" }, "role")
                      }
                      placeholder="Admin, 123456789012345678, <@&123456789012345678>"
                    />
                    <p className="text-[11px] text-fog/50">
                      Role name, role ID or role mention can be used.
                    </p>
                    <label className="block space-y-2 text-xs text-fog/60">
                      <span>Specific User ID (optional)</span>
                      <VariableInput
                        value={ifElseRoleUserId}
                        placeholder="123456789012345678"
                        onValueChange={(value) => {
                          const nextUserId = value.trim();
                          const nextRole = ifElsePrimaryRule?.right ?? "Admin";
                          const nextGroup = buildRoleConditionGroup(nextRole, nextUserId);
                          updateNodeData({
                            roleUserId: nextUserId,
                            conditionPreset: "role",
                            conditions: nextGroup,
                            summary: formatConditionGroupPreview(nextGroup)
                          });
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <VariableInput
                    value={ifElsePrimaryRule?.left ?? "options.value"}
                    onValueChange={(value) => applySimpleIfElse({ left: value })}
                    placeholder="options.value"
                  />
                )}
              </label>

              {ifElsePreset !== "permission" && ifElsePreset !== "role" && (
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Comparison Type</span>
                  <Select
                    value={ifElsePrimaryRule?.operator ?? "equals"}
                    onChange={(event) => applySimpleIfElse({ operator: event.target.value as ConditionOperator })}
                  >
                    <option value="equals">Equal to</option>
                    <option value="notEquals">Not equal to</option>
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts with</option>
                    <option value="endsWith">Ends with</option>
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="in">In list</option>
                  </Select>
                </label>
              )}

              {ifElsePreset !== "permission" && ifElsePreset !== "role" && (
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Comparison Value</span>
                  <VariableInput
                    value={ifElsePrimaryRule?.right ?? "10"}
                    onValueChange={(value) => applySimpleIfElse({ right: value })}
                    placeholder="10"
                  />
                </label>
              )}
            </div>
          )}

          <label className="block space-y-2 text-xs text-fog/60">
            <span>Block Label</span>
            <Input
              value={String((selectedNode.data as any)?.label ?? "If / Else")}
              onChange={(event) => updateField("label", event.target.value)}
            />
          </label>

          <Button variant="outline" size="sm" onClick={resetConditionBuilder}>
            Reset Conditions
          </Button>
        </div>
      )}

      {selected.type === "SwitchCase" && (
        <div className="space-y-2">
          <VariableInput
            placeholder="Expression"
            value={(selected.data as any)?.expression ?? ""}
            onValueChange={(value) => updateField("expression", value)}
          />
          <VariableTextarea
            placeholder="Cases (one per line)"
            value={((selected.data as any)?.cases ?? []).map((c: any) => c.value).join("\n")}
            onValueChange={(value) => updateSwitchCases(value)}
          />
        </div>
      )}

      {selected.type === "EmbedMessage" && (
        <div className="space-y-3">
          <label className="block space-y-2 text-xs text-fog/60">
            <span>Channel ID (optional)</span>
            <VariableInput
              placeholder="Leave empty to reply to the command"
              value={(selected.data as any)?.channelId ?? ""}
              onValueChange={(value) => updateField("channelId", value)}
            />
          </label>
          <Button variant="outline" size="sm" onClick={() => setShowEmbedEditor(true)}>
            Open Embed Editor
          </Button>
        </div>
      )}

      {buttonEnabledNodes.has(selected.type as string) && selected.type !== "EmbedMessage" && (
        <div className="pt-2">
          {ButtonsEditor}
        </div>
      )}
      {selectMenuEnabledNodes.has(selected.type as string) && selected.type !== "EmbedMessage" && (
        <div>
          {SelectMenusEditor}
        </div>
      )}

      {fields.map((field) => {
        const value = (selected.data as any)?.[field.key] ?? "";
        const options = fieldSelectOptions[field.key];
        return (
          <label key={field.key} className="block space-y-2 text-xs text-fog/60">
            <span>{field.label}</span>
            {options ? (
              <Select
                value={String(value || options[0]?.value || "")}
                onChange={(event) => updateField(field.key, event.target.value)}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : field.type === "textarea" ? (
              <VariableTextarea value={value} onValueChange={(val) => updateField(field.key, val)} />
            ) : field.type === "number" ? (
              <Input
                type="number"
                value={value}
                onChange={(e) => updateField(field.key, Number(e.target.value))}
              />
            ) : (
              <VariableInput
                type={field.type}
                value={String(value ?? "")}
                placeholder={fieldPlaceholders[field.key]}
                onValueChange={(val) =>
                  updateField(field.key, field.type === "number" ? Number(val) : val)
                }
              />
            )}
          </label>
        );
      })}
      <Button variant="outline" size="sm" onClick={() => updateField("disabled", !selected.data?.disabled as any)}>
        {selected.data?.disabled ? "Enable Node" : "Disable Node"}
      </Button>

      {isMounted && selected.type === "EmbedMessage" && showEmbedEditor &&
        createPortal(
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-6" onClick={() => setShowEmbedEditor(false)}>
            <div
              className="flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink/95 p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-fog/60">Embed Builder</p>
                  <h3 className="font-display text-lg text-fog">Discord V1 Embed</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowEmbedEditor(false)}>
                  Close
                </Button>
              </div>
              <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_460px]">
                <div className="scroll-area min-h-0 max-h-full space-y-4 overflow-auto pr-2">
              <label className="block space-y-2 text-xs text-fog/60">
                <span>Title</span>
                <VariableInput
                  value={(selected.data as any)?.title ?? ""}
                  onValueChange={(value) => updateField("title", value)}
                />
              </label>
              <label className="block space-y-2 text-xs text-fog/60">
                <span>Description</span>
                <VariableTextarea
                  value={(selected.data as any)?.description ?? ""}
                  onValueChange={(value) => updateField("description", value)}
                />
              </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2 text-xs text-fog/60">
                    <span>URL</span>
                  <VariableInput
                    value={(selected.data as any)?.url ?? ""}
                    onValueChange={(value) => updateField("url", value)}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Color (hex)</span>
                  <VariableInput
                    placeholder="#5865F2"
                    value={(selected.data as any)?.color ?? ""}
                    onValueChange={(value) => updateField("color", value)}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Author Name</span>
                  <VariableInput
                    value={(selected.data as any)?.authorName ?? ""}
                    onValueChange={(value) => updateField("authorName", value)}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Author URL</span>
                  <VariableInput
                    value={(selected.data as any)?.authorUrl ?? ""}
                    onValueChange={(value) => updateField("authorUrl", value)}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60 md:col-span-2">
                  <span>Author Icon URL</span>
                  <VariableInput
                    value={(selected.data as any)?.authorIconUrl ?? ""}
                    onValueChange={(value) => updateField("authorIconUrl", value)}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Footer Text</span>
                  <VariableInput
                    value={(selected.data as any)?.footer ?? ""}
                    onValueChange={(value) => updateField("footer", value)}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Footer Icon URL</span>
                  <VariableInput
                    value={(selected.data as any)?.footerIconUrl ?? ""}
                    onValueChange={(value) => updateField("footerIconUrl", value)}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Thumbnail URL (top-right)</span>
                  <VariableInput
                    value={(selected.data as any)?.thumbnailUrl ?? ""}
                    onValueChange={(value) => updateField("thumbnailUrl", value)}
                  />
                </label>
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Image URL (large)</span>
                  <VariableInput
                    value={(selected.data as any)?.imageUrl ?? ""}
                    onValueChange={(value) => updateField("imageUrl", value)}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="block space-y-2 text-xs text-fog/60">
                  <span>Timestamp (ISO or "now")</span>
                  <VariableInput
                    value={(selected.data as any)?.timestamp ?? ""}
                    onValueChange={(value) => updateField("timestamp", value)}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                    className="self-end"
                    onClick={() => updateField("timestamp", "now")}
                  >
                    Use now
                  </Button>
                </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-fog/60">Fields</p>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateField("fields", [
                          ...(((selected.data as any)?.fields ?? []) as any[]),
                          { name: "Field title", value: "Field value", inline: false }
                        ])
                      }
                    >
                      Add Field
                    </Button>
                  </div>
                  {(((selected.data as any)?.fields ?? []) as any[]).map((field, index) => (
                    <div key={`${field.name}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-2 text-xs text-fog/60">
                        <span>Name</span>
                        <VariableInput
                          value={field.name ?? ""}
                          onValueChange={(value) => {
                            const next = [...(((selected.data as any)?.fields ?? []) as any[])];
                            next[index] = { ...next[index], name: value };
                            updateField("fields", next);
                          }}
                        />
                      </label>
                      <label className="block space-y-2 text-xs text-fog/60">
                        <span>Value</span>
                        <VariableInput
                          value={field.value ?? ""}
                          onValueChange={(value) => {
                            const next = [...(((selected.data as any)?.fields ?? []) as any[])];
                            next[index] = { ...next[index], value };
                            updateField("fields", next);
                          }}
                        />
                      </label>
                    </div>
                      <div className="mt-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-fog/60">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-white/30 bg-white/10 accent-ember"
                            checked={Boolean(field.inline)}
                            onChange={(e) => {
                              const next = [...(((selected.data as any)?.fields ?? []) as any[])];
                              next[index] = { ...next[index], inline: e.target.checked };
                              updateField("fields", next);
                            }}
                          />
                          Inline
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = [...(((selected.data as any)?.fields ?? []) as any[])];
                            next.splice(index, 1);
                            updateField("fields", next);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                ))}
              </div>
              <div className="pt-4">
                {ButtonsEditor}
              </div>
              {SelectMenusEditor}
            </div>
                <aside className="scroll-area min-h-0 max-h-full overflow-auto rounded-2xl border border-white/10 bg-[#1f2329] p-4">
                  {embedPreviewPane}
                </aside>
              </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
