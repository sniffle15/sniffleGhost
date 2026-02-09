"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_SCHEMA_VERSION = exports.NODE_CATEGORIES = void 0;
exports.NODE_CATEGORIES = {
    Messaging: ["ReplyMessage", "SendChannelMessage", "SendDM", "EmbedMessage"],
    Variables: ["SetVariable", "GetPersistentVariable", "SetPersistentVariable"],
    "Control Flow": ["IfElse", "SwitchCase", "Loop", "Delay", "Stop"],
    Moderation: ["AddRole", "RemoveRole"],
    Integrations: ["HttpRequest"],
    Utility: ["Logger"]
};
exports.WORKFLOW_SCHEMA_VERSION = 1;
