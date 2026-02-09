"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap, type ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./node-types";
import { useBuilderStore } from "./store";
import { Palette, type PaletteNodePayload } from "./palette";
import { Inspector } from "./inspector";
import { Toolbar } from "./toolbar";
import type { ValidationIssue } from "./validation-panel";
import { authFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface BuilderProps {
  versionId: string;
  initialWorkflow: any;
  onClose: () => void;
}

function parsePalettePayload(raw: string | PaletteNodePayload): PaletteNodePayload {
  if (typeof raw !== "string") return raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.nodeType === "string") {
      return parsed as PaletteNodePayload;
    }
  } catch {
    // Keep backward compatibility with plain node type payload.
  }
  return { nodeType: raw };
}

function buildNodeData(payload: PaletteNodePayload): Record<string, unknown> {
  const { nodeType, preset, label } = payload;
  if (nodeType === "IfElse" && preset === "ifelse-comparison") {
    return {
      label: label ?? "Comparison Condition",
      type: nodeType,
      conditionPreset: "comparison",
      summary: "options.value == 10",
      conditions: { op: "AND", rules: [{ left: "options.value", operator: "equals", right: "10" }] }
    };
  }
  if (nodeType === "IfElse" && preset === "ifelse-chance") {
    return {
      label: label ?? "Chance Condition",
      type: nodeType,
      conditionPreset: "chance",
      summary: "{{random(0,100)}} < 10",
      conditions: { op: "AND", rules: [{ left: "{{random(0,100)}}", operator: "lt", right: "10" }] }
    };
  }
  if (nodeType === "IfElse" && preset === "ifelse-permission") {
    return {
      label: label ?? "Permissions Condition",
      type: nodeType,
      conditionPreset: "permission",
      summary: "memberRoles hasPermission Administrator",
      conditions: { op: "AND", rules: [{ left: "memberRoles", operator: "hasPermission", right: "Administrator" }] }
    };
  }
  if (nodeType === "IfElse" && preset === "ifelse-role") {
    return {
      label: label ?? "Role Condition",
      type: nodeType,
      conditionPreset: "role",
      roleUserId: "",
      summary: "memberRoles hasRole Admin",
      conditions: { op: "AND", rules: [{ left: "memberRoles", operator: "hasRole", right: "Admin" }] }
    };
  }
  if (nodeType === "IfElse" && preset === "ifelse-channel") {
    return {
      label: label ?? "Channel Condition",
      type: nodeType,
      conditionPreset: "channel",
      summary: "channel.id == 1234567890",
      conditions: { op: "AND", rules: [{ left: "channel.id", operator: "equals", right: "1234567890" }] }
    };
  }
  if (nodeType === "IfElse" && preset === "ifelse-user") {
    return {
      label: label ?? "User Condition",
      type: nodeType,
      conditionPreset: "user",
      summary: "user.id == 1234567890",
      conditions: { op: "AND", rules: [{ left: "user.id", operator: "equals", right: "1234567890" }] }
    };
  }
  return {
    label: label ?? nodeType,
    type: nodeType
  };
}

export function Builder({ versionId, initialWorkflow, onClose }: BuilderProps) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    dirty,
    markSaved,
    snapshot,
    undo,
    redo,
    selectNode,
    selectedNodeId
  } = useBuilderStore();

  const [validationNotice, setValidationNotice] = useState<{
    level: "error" | "warning";
    messages: string[];
  } | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<number | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [proxySelected, setProxySelected] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (initialWorkflow) {
      setNodes(initialWorkflow.nodes ?? []);
      setEdges(initialWorkflow.edges ?? []);
      markSaved();
    }
  }, [initialWorkflow, setNodes, setEdges, markSaved]);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const el = shellRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = Math.max(0, window.innerHeight - rect.top - 8);
      setShellHeight(height);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const workflow = useMemo(() => ({ version: 1, nodes, edges }), [nodes, edges]);
  function isButtonProxyId(id?: string) {
    return typeof id === "string" && id.startsWith("btnnode:");
  }

  function isSelectProxyId(id?: string) {
    return typeof id === "string" && id.startsWith("selnode:");
  }

  function isProxyNodeId(id?: string) {
    return isButtonProxyId(id) || isSelectProxyId(id);
  }

  function parseButtonProxyId(id: string) {
    const parts = id.split(":");
    return { parentId: parts[1], buttonId: parts.slice(2).join(":") };
  }

  function parseSelectProxyId(id: string) {
    const parts = id.split(":");
    return {
      parentId: parts[1],
      menuId: parts[2],
      optionId: parts.slice(3).join(":")
    };
  }

  const handleConnect = useCallback(
    (connection: any) => {
      snapshot();
      if (isButtonProxyId(connection.source)) {
        const { parentId, buttonId } = parseButtonProxyId(connection.source);
        onConnect({
          ...connection,
          source: parentId,
          sourceHandle: `button:${buttonId}`
        });
        return;
      }
      if (isSelectProxyId(connection.source)) {
        const { parentId, menuId, optionId } = parseSelectProxyId(connection.source);
        onConnect({
          ...connection,
          source: parentId,
          sourceHandle: `select:${menuId}:${optionId}`
        });
        return;
      }
      onConnect(connection);
    },
    [onConnect, snapshot]
  );

  const runValidation = useCallback(async () => {
    const result = await authFetch(`/versions/${versionId}/validate`, {
      method: "POST",
      body: JSON.stringify(workflow)
    });
    return result as ValidationIssue[];
  }, [versionId, workflow]);

  const save = useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      const issues = await runValidation();
      const errors = issues.filter((issue) => issue.level === "error");
      const warnings = issues.filter((issue) => issue.level === "warning");
      if (errors.length > 0) {
        if (mode === "manual") {
          setValidationNotice({
            level: "error",
            messages: errors.map((issue) => issue.message)
          });
        }
        return;
      }
      if (warnings.length > 0 && mode === "manual") {
        setValidationNotice({
          level: "warning",
          messages: warnings.map((issue) => issue.message)
        });
      } else {
        setValidationNotice(null);
      }
      await authFetch(`/versions/${versionId}`, {
        method: "PATCH",
        body: JSON.stringify(workflow)
      });
      markSaved();
    },
    [versionId, workflow, markSaved, runValidation]
  );

  const publish = useCallback(async () => {
    const issues = await runValidation();
    const errors = issues.filter((issue) => issue.level === "error");
    if (errors.length > 0) {
      setValidationNotice({
        level: "error",
        messages: errors.map((issue) => issue.message)
      });
      return;
    }
    setValidationNotice(null);
    await authFetch(`/versions/${versionId}/publish`, { method: "POST" });
  }, [versionId, runValidation]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirty) {
        save("auto").catch(() => undefined);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [dirty, save]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
      if (event.key === "Delete" && selectedNodeId && !proxySelected) {
        event.preventDefault();
        setNodes(nodes.filter((node) => node.id !== selectedNodeId));
        setEdges(edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
        selectNode(undefined);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if ((document.body as any).dataset?.modalOpen === "1") return;
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, undo, redo, selectedNodeId, nodes, edges, setNodes, setEdges, selectNode, onClose, proxySelected]);

  const displayNodes = useMemo(() => {
    const buttonNodes: any[] = [];
    const selectOptionNodes: any[] = [];
    const baseNodes = nodes.map((node) => {
      const buttons = Array.isArray((node.data as any)?.buttons) ? (node.data as any)?.buttons : [];
      const actionButtons = buttons.filter((btn: any) => String(btn?.style ?? "").toUpperCase() !== "LINK");
      const selectMenus = Array.isArray((node.data as any)?.selectMenus) ? (node.data as any)?.selectMenus : [];
      const actionSelectOptions = selectMenus.flatMap((menu: any) =>
        (Array.isArray(menu?.options) ? menu.options : []).map((option: any, index: number) => ({
          menuId: menu.id ?? `menu_${index}`,
          menuPlaceholder: menu.placeholder,
          optionId: option.id ?? `opt_${index}`,
          optionValue: option.value ?? "",
          optionLabel: option.label ?? option.value ?? "Option"
        }))
      );

      const hasButtonProxies = actionButtons.length > 0;
      const hasSelectProxies = actionSelectOptions.length > 0;

      if (hasButtonProxies) {
        const totalWidth = (actionButtons.length - 1) * 120;
        actionButtons.forEach((button: any, index: number) => {
          const x = node.position.x - totalWidth / 2 + index * 120;
          const y = node.position.y + 120;
          const buttonId = button.id ?? index;
          buttonNodes.push({
            id: `btnnode:${node.id}:${buttonId}`,
            type: "ButtonProxy",
            position: { x, y },
            data: { label: button.label, style: button.style, parentId: node.id, buttonId },
            draggable: false,
            deletable: false
          });
        });
      }

      if (hasSelectProxies) {
        const totalWidth = (actionSelectOptions.length - 1) * 160;
        actionSelectOptions.forEach((option: any, index: number) => {
          const x = node.position.x - totalWidth / 2 + index * 160;
          const y = node.position.y + (hasButtonProxies ? 220 : 120);
          selectOptionNodes.push({
            id: `selnode:${node.id}:${option.menuId}:${option.optionId}`,
            type: "SelectOptionProxy",
            position: { x, y },
            data: {
              parentId: node.id,
              menuId: option.menuId,
              optionId: option.optionId,
              optionValue: option.optionValue,
              optionLabel: option.optionLabel,
              menuPlaceholder: option.menuPlaceholder
            },
            draggable: false,
            deletable: false
          });
        });
      }

      if (!hasButtonProxies && !hasSelectProxies) return node;
      return {
        ...node,
        data: {
          ...node.data,
          ...(hasButtonProxies ? { hideButtonHandles: true } : {}),
          ...(hasSelectProxies ? { hideSelectHandles: true } : {})
        }
      };
    });
    return [...baseNodes, ...buttonNodes, ...selectOptionNodes];
  }, [nodes]);

  const displayEdges = useMemo(() => {
    const buttonEdges: any[] = [];
    const selectEdges: any[] = [];
    const mapped = edges.map((edge) => {
      const handle = edge.sourceHandle ?? "";
      if (handle.startsWith("button:")) {
        const buttonId = handle.slice("button:".length);
        return { ...edge, source: `btnnode:${edge.source}:${buttonId}` };
      }
      if (handle.startsWith("select:")) {
        const raw = handle.slice("select:".length);
        const parts = raw.split(":");
        const menuId = parts.shift();
        const optionId = parts.join(":");
        if (!menuId || !optionId) return edge;
        return { ...edge, source: `selnode:${edge.source}:${menuId}:${optionId}` };
      }
      return edge;
    });

    nodes.forEach((node) => {
      const buttons = Array.isArray((node.data as any)?.buttons) ? (node.data as any)?.buttons : [];
      const actionButtons = buttons.filter((btn: any) => String(btn?.style ?? "").toUpperCase() !== "LINK");
      const totalWidth = (actionButtons.length - 1) * 120;
      actionButtons.forEach((button: any, index: number) => {
        const buttonId = button.id ?? index;
        buttonEdges.push({
          id: `btnedge:${node.id}:${buttonId}`,
          source: node.id,
          target: `btnnode:${node.id}:${buttonId}`,
          selectable: false,
          deletable: false,
          style: { stroke: "rgba(255,255,255,0.25)", strokeDasharray: "4 6" }
        });
      });

      const selectMenus = Array.isArray((node.data as any)?.selectMenus) ? (node.data as any)?.selectMenus : [];
      const actionSelectOptions = selectMenus.flatMap((menu: any) =>
        (Array.isArray(menu?.options) ? menu.options : []).map((option: any, index: number) => ({
          menuId: menu.id ?? `menu_${index}`,
          optionId: option.id ?? `opt_${index}`
        }))
      );
      actionSelectOptions.forEach((option: any) => {
        selectEdges.push({
          id: `seledge:${node.id}:${option.menuId}:${option.optionId}`,
          source: node.id,
          target: `selnode:${node.id}:${option.menuId}:${option.optionId}`,
          selectable: false,
          deletable: false,
          style: { stroke: "rgba(125,211,252,0.35)", strokeDasharray: "4 6" }
        });
      });
    });

    return [...mapped, ...buttonEdges, ...selectEdges];
  }, [edges, nodes]);

  const handleNodesChange = useCallback(
    (changes: any[]) => {
      const filtered = changes.filter((change) => !isProxyNodeId(change.id));
      if (filtered.length) onNodesChange(filtered);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      const filtered = changes.filter(
        (change) =>
          !String(change.id ?? "").startsWith("btnedge:") &&
          !String(change.id ?? "").startsWith("seledge:")
      );
      if (filtered.length) onEdgesChange(filtered);
    },
    [onEdgesChange]
  );

  const templates = useMemo(
    () => [
      {
        name: "Hello World",
        nodes: [
          { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
          { id: "r", type: "ReplyMessage", position: { x: 0, y: 160 }, data: { template: "Hello {{user.username}}!" } },
          { id: "s", type: "Stop", position: { x: 0, y: 320 }, data: {} }
        ],
        edges: [
          { id: "e1", source: "t", target: "r" },
          { id: "e2", source: "r", target: "s" }
        ]
      },
      {
        name: "Role Gate",
        nodes: [
          { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "gate" } },
          {
            id: "if",
            type: "IfElse",
            position: { x: 0, y: 160 },
            data: {
              summary: "memberRoles has Admin",
              conditions: { op: "AND", rules: [{ left: "memberRoles", operator: "hasRole", right: "Admin" }] }
            }
          },
          { id: "r1", type: "ReplyMessage", position: { x: -160, y: 320 }, data: { template: "Welcome admin!" } },
          { id: "r2", type: "ReplyMessage", position: { x: 160, y: 320 }, data: { template: "No access." } },
          { id: "s", type: "Stop", position: { x: 0, y: 520 }, data: {} }
        ],
        edges: [
          { id: "e1", source: "t", target: "if" },
          { id: "e2", source: "if", sourceHandle: "true", target: "r1" },
          { id: "e3", source: "if", sourceHandle: "false", target: "r2" },
          { id: "e4", source: "r1", target: "s" },
          { id: "e5", source: "r2", target: "s" }
        ]
      },
      {
        name: "API Call + Embed",
        nodes: [
          { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "status" } },
          { id: "http", type: "HttpRequest", position: { x: 0, y: 160 }, data: { method: "GET", url: "https://api.github.com", responseVar: "api" } },
          { id: "embed", type: "EmbedMessage", position: { x: 0, y: 320 }, data: { title: "API Status", description: "Response: {{vars.api}}", color: "#7dd3fc" } },
          { id: "s", type: "Stop", position: { x: 0, y: 480 }, data: {} }
        ],
        edges: [
          { id: "e1", source: "t", target: "http" },
          { id: "e2", source: "http", sourceHandle: "success", target: "embed" },
          { id: "e3", source: "http", sourceHandle: "failure", target: "s" },
          { id: "e4", source: "embed", target: "s" }
        ]
      }
    ],
    []
  );

  function applyTemplate(template: { nodes: any[]; edges: any[] }) {
    snapshot();
    const stamp = Date.now();
    const idMap = new Map<string, string>();
    const newNodes = template.nodes.map((node: any) => {
      const newId = `${node.id}-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(node.id, newId);
      return { ...node, id: newId };
    });
    const newEdges = template.edges.map((edge: any) => ({
      ...edge,
      id: `${edge.id}-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target
    }));
    setNodes(newNodes);
    setEdges(newEdges);
  }

  function addNode(rawPayload: string | PaletteNodePayload, position?: { x: number; y: number }) {
    const payload = parsePalettePayload(rawPayload);
    const type = payload.nodeType;
    snapshot();
    const id = `${type}-${Date.now()}`;
    const fallbackPosition = { x: 380, y: 80 + nodes.length * 140 };
    setNodes([
      ...nodes,
      {
        id,
        type,
        position: position ?? fallbackPosition,
        data: buildNodeData(payload)
      }
    ]);
    setProxySelected(false);
    selectNode(id);
  }

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX <= bounds.left ||
      event.clientX >= bounds.right ||
      event.clientY <= bounds.top ||
      event.clientY >= bounds.bottom
    ) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const payloadRaw = event.dataTransfer.getData("application/reactflow");
      if (!payloadRaw || !flowInstance || !flowWrapperRef.current) return;
      const bounds = flowWrapperRef.current.getBoundingClientRect();
      const position = flowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      });
      addNode(payloadRaw, position);
    },
    [flowInstance, addNode]
  );

  return (
    <div
      ref={shellRef}
      style={shellHeight ? { height: `${shellHeight}px` } : undefined}
      className="grid min-h-0 gap-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-3 xl:grid-cols-[320px_minmax(0,1fr)_360px]"
    >
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#10151c]/95 p-4">
        <div className="scroll-area flex-1 min-h-0 overflow-auto pr-2">
          <Palette onAddNode={addNode} templates={templates} onApplyTemplate={applyTemplate} />
        </div>
      </aside>

      <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#181f29]/95 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Toolbar
            onSave={save}
            onUndo={undo}
            onRedo={redo}
            onPublish={publish}
            onClose={onClose}
            dirty={dirty}
          />
          <span className="text-xs text-fog/50">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
        {validationNotice && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-xs ${
              validationNotice.level === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-amber-400/40 bg-amber-400/10 text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>
                {validationNotice.level === "error"
                  ? "Please fix the highlighted issues before saving."
                  : "Saved with warnings. Consider reviewing these items."}
              </span>
              <button className="text-xs underline" onClick={() => setValidationNotice(null)}>
                Dismiss
              </button>
            </div>
            <ul className="mt-2 list-disc pl-4">
              {validationNotice.messages.slice(0, 5).map((msg, index) => (
                <li key={`${msg}-${index}`}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        <div
          ref={flowWrapperRef}
          className={cn(
            "relative flex-1 min-h-0 overflow-hidden rounded-2xl border transition-colors",
            dragOver ? "border-emerald-300/70 bg-emerald-300/5" : "border-white/10 bg-[#1b222c]"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-ink/50">
              <div className="rounded-2xl border border-emerald-300/60 bg-emerald-300/15 px-4 py-2 text-sm font-semibold text-emerald-100">
                Drop block to add node
              </div>
            </div>
          )}
          <ReactFlow
            className="h-full w-full"
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => {
              if (isProxyNodeId(node.id)) {
                setProxySelected(true);
                selectNode((node.data as any)?.parentId);
                return;
              }
              setProxySelected(false);
              selectNode(node.id);
            }}
            onPaneClick={() => {
              setProxySelected(false);
              selectNode(undefined);
            }}
            nodeTypes={nodeTypes}
            snapToGrid
            snapGrid={[20, 20]}
            fitView
            onInit={setFlowInstance}
          >
            <MiniMap />
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#344153" />
          </ReactFlow>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#10151c]/95 p-4">
        <div className="scroll-area flex-1 min-h-0 overflow-auto pr-2">
          {selectedNodeId ? (
            <Inspector />
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-fog/50">Block Settings</p>
              <p className="text-sm text-fog/70">
                Click a block on the canvas to edit its properties.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
