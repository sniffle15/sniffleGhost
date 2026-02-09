import type { NodeType } from "./workflow/types";

export const NODE_CATEGORIES: Record<string, NodeType[]> = {
  Messaging: ["ReplyMessage", "SendChannelMessage", "SendDM", "EmbedMessage"],
  Variables: ["SetVariable", "GetPersistentVariable", "SetPersistentVariable"],
  "Control Flow": ["IfElse", "SwitchCase", "Loop", "Delay", "Stop"],
  Moderation: ["AddRole", "RemoveRole"],
  Integrations: ["HttpRequest"],
  Utility: ["Logger"]
};

export const WORKFLOW_SCHEMA_VERSION = 1;
