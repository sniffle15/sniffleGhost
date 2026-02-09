import { GripVertical } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import { NODE_CATEGORIES } from "@botghost/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Edge, Node } from "reactflow";
import { cn } from "@/lib/utils";

interface Template {
  name: string;
  nodes: Node[];
  edges: Edge[];
}

interface PaletteProps {
  onAddNode: (payload: PaletteNodePayload) => void;
  templates?: Template[];
  onApplyTemplate?: (template: Template) => void;
}

type PaletteTab = "Options" | "Actions" | "Conditions";

export interface PaletteNodePayload {
  nodeType: string;
  preset?: string;
  label?: string;
}

interface BlockDefinition {
  payload: PaletteNodePayload;
  label: string;
  description: string;
  lane: PaletteTab;
}

interface BlockGroup {
  category: string;
  blocks: BlockDefinition[];
}

const BLOCK_INFO: Record<string, Omit<BlockDefinition, "payload">> = {
  ReplyMessage: {
    label: "Plain Text Reply",
    description: "Send a quick command response with optional buttons or select menus.",
    lane: "Actions"
  },
  SendChannelMessage: {
    label: "Send Channel Message",
    description: "Post a message into a specific channel and continue the flow.",
    lane: "Actions"
  },
  SendDM: {
    label: "Send DM",
    description: "Send a direct message to command user or a specific target user ID.",
    lane: "Actions"
  },
  EmbedMessage: {
    label: "Embed Message",
    description: "Build and send a Discord V1 embed with fields, media and components.",
    lane: "Actions"
  },
  SetVariable: {
    label: "Set Variable",
    description: "Store a local value for the rest of this workflow execution.",
    lane: "Options"
  },
  GetPersistentVariable: {
    label: "Load Persistent Var",
    description: "Load user or guild data from persistent storage into the flow.",
    lane: "Options"
  },
  SetPersistentVariable: {
    label: "Save Persistent Var",
    description: "Write data to persistent user or guild storage.",
    lane: "Options"
  },
  IfElse: {
    label: "If / Else (Advanced)",
    description: "Advanced mode with custom condition expression setup.",
    lane: "Conditions"
  },
  SwitchCase: {
    label: "Switch Case",
    description: "Route execution to different paths based on one expression.",
    lane: "Conditions"
  },
  Loop: {
    label: "Loop",
    description: "Iterate over a list and run a branch for each entry.",
    lane: "Conditions"
  },
  Delay: {
    label: "Delay",
    description: "Pause execution for a defined amount of milliseconds.",
    lane: "Options"
  },
  Stop: {
    label: "Stop Workflow",
    description: "End the current execution path immediately.",
    lane: "Conditions"
  },
  AddRole: {
    label: "Add Role",
    description: "Assign a role to command user or a specific target user ID.",
    lane: "Actions"
  },
  RemoveRole: {
    label: "Remove Role",
    description: "Remove a role from command user or a specific target user ID.",
    lane: "Actions"
  },
  HttpRequest: {
    label: "HTTP Request",
    description: "Call external APIs and map the response into workflow variables.",
    lane: "Actions"
  },
  Logger: {
    label: "Logger",
    description: "Write structured execution logs for debugging and monitoring.",
    lane: "Actions"
  }
};

const EXTRA_BLOCKS: Array<{
  category: string;
  payload: PaletteNodePayload;
  label: string;
  description: string;
  lane: PaletteTab;
}> = [
  {
    category: "Control Flow",
    payload: { nodeType: "IfElse", preset: "ifelse-comparison", label: "Comparison Condition" },
    label: "Comparison Condition",
    description: "Run actions based on the difference between two values.",
    lane: "Conditions"
  },
  {
    category: "Control Flow",
    payload: { nodeType: "IfElse", preset: "ifelse-chance", label: "Chance Condition" },
    label: "Chance Condition",
    description: "Run actions based on a random chance threshold.",
    lane: "Conditions"
  },
  {
    category: "Control Flow",
    payload: { nodeType: "IfElse", preset: "ifelse-permission", label: "Permissions Condition" },
    label: "Permissions Condition",
    description: "Run actions based on the server permissions of the user.",
    lane: "Conditions"
  },
  {
    category: "Control Flow",
    payload: { nodeType: "IfElse", preset: "ifelse-role", label: "Role Condition" },
    label: "Role Condition",
    description: "Branch by role membership, e.g. only users with Admin role.",
    lane: "Conditions"
  },
  {
    category: "Control Flow",
    payload: { nodeType: "IfElse", preset: "ifelse-channel", label: "Channel Condition" },
    label: "Channel Condition",
    description: "Run actions based on the channel where the command was used.",
    lane: "Conditions"
  },
  {
    category: "Control Flow",
    payload: { nodeType: "IfElse", preset: "ifelse-user", label: "User Condition" },
    label: "User Condition",
    description: "Run actions based on who used the command.",
    lane: "Conditions"
  }
];

export function Palette({ onAddNode, templates = [], onApplyTemplate }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PaletteTab>("Actions");

  const groupedBlocks = useMemo(() => {
    const base: BlockGroup[] = Object.entries(NODE_CATEGORIES).map(([category, nodes]) => ({
      category,
      blocks: nodes.map((nodeType) => {
        const info = BLOCK_INFO[nodeType];
        return {
          payload: { nodeType: String(nodeType) },
          label: info?.label ?? String(nodeType),
          description: info?.description ?? `Configure ${String(nodeType)}`,
          lane: info?.lane ?? "Actions"
        };
      })
    }));

    EXTRA_BLOCKS.forEach((extra) => {
      const found = base.find((entry) => entry.category === extra.category);
      const block: BlockDefinition = {
        payload: extra.payload,
        label: extra.label,
        description: extra.description,
        lane: extra.lane
      };
      if (found) {
        found.blocks.push(block);
      } else {
        base.push({
          category: extra.category,
          blocks: [block]
        });
      }
    });
    return base;
  }, []);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return groupedBlocks
      .map((group) => ({
        category: group.category,
        blocks: group.blocks.filter((block) => {
          if (block.lane !== tab) return false;
          if (!lower) return true;
          return (
            block.label.toLowerCase().includes(lower) ||
            block.payload.nodeType.toLowerCase().includes(lower) ||
            String(block.payload.preset ?? "").toLowerCase().includes(lower) ||
            block.description.toLowerCase().includes(lower)
          );
        })
      }))
      .filter((group) => group.blocks.length > 0);
  }, [groupedBlocks, query, tab]);

  function handleDragStart(event: DragEvent<HTMLElement>, payload: PaletteNodePayload) {
    const encoded = JSON.stringify(payload);
    event.dataTransfer.setData("application/reactflow", encoded);
    event.dataTransfer.setData("text/plain", encoded);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-fog">Blocks</h3>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-fog/60">
            Drag + Drop
          </span>
        </div>
        <p className="text-xs leading-relaxed text-fog/60">
          Drag and drop <span className="text-sky">Options</span>, <span className="text-emerald-300">Actions</span> and{" "}
          <span className="text-amber-200">Conditions</span> into the canvas. Click a block for quick add.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
        {(["Options", "Actions", "Conditions"] as PaletteTab[]).map((lane) => (
          <button
            key={lane}
            type="button"
            onClick={() => setTab(lane)}
            className={cn(
              "rounded-xl px-2 py-2 text-xs font-semibold tracking-wide transition-colors",
              tab === lane ? "bg-ink text-fog shadow" : "text-fog/60 hover:text-fog"
            )}
          >
            {lane}
          </button>
        ))}
      </div>

      <Input placeholder="Search blocks" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="space-y-5">
        {filtered.map((group) => (
          <div key={group.category}>
            <p className="text-xs uppercase tracking-[0.24em] text-fog/50">{group.category}</p>
            <div className="mt-2 flex flex-col gap-2">
              {group.blocks.map((block) => (
                <div
                  key={`${block.payload.nodeType}:${block.payload.preset ?? "default"}`}
                  draggable
                  onDragStart={(event) => handleDragStart(event, block.payload)}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 transition hover:border-white/20 hover:bg-white/[0.1]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 cursor-grab text-fog/35 active:cursor-grabbing">
                      <GripVertical size={16} />
                    </div>
                    <button type="button" className="flex-1 text-left" onClick={() => onAddNode(block.payload)}>
                      <p className="text-sm font-semibold text-fog">{block.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-fog/60">{block.description}</p>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] px-3 py-4 text-xs text-fog/60">
            No blocks found for this filter.
          </div>
        )}
      </div>

      {templates.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-fog/50">Templates</p>
          <div className="mt-2 flex flex-col gap-2">
            {templates.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => onApplyTemplate?.(template)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
