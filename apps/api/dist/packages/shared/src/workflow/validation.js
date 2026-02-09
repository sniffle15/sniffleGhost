"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWorkflow = validateWorkflow;
const constants_1 = require("../constants");
const requiredFields = {
    SlashCommandTrigger: ["commandName"],
    ReplyMessage: ["template"],
    SendChannelMessage: ["channelId", "template"],
    SendDM: ["template"],
    IfElse: ["conditions"],
    SwitchCase: ["expression"],
    Loop: ["listExpression", "itemVar"],
    SetVariable: ["name", "value"],
    GetPersistentVariable: ["key", "scope", "assignTo"],
    SetPersistentVariable: ["key", "scope", "value"],
    Delay: ["ms"],
    HttpRequest: ["method", "url"],
    AddRole: ["roleId"],
    RemoveRole: ["roleId"],
    Logger: ["level", "message"]
};
const templateFields = {
    ReplyMessage: ["template"],
    SendChannelMessage: ["template"],
    SendDM: ["template"],
    EmbedMessage: ["title", "description", "footer"],
    Logger: ["message"],
    SetVariable: ["value"],
    SetPersistentVariable: ["value"],
    HttpRequest: ["body"]
};
const allowedRoots = new Set(["user", "guild", "channel", "options", "vars", "variables", "memberRoles"]);
const allowedFunctions = new Set(["upper", "lower", "toNumber", "random", "now", "format", "json.path", "jsonPath"]);
function hasRequired(node, field) {
    return node.data && node.data[field] !== undefined && node.data[field] !== "";
}
function validateTemplate(issueTarget, value, issues) {
    const matches = value.matchAll(/\{\{\s*([^}]+)\s*\}\}/g);
    for (const match of matches) {
        const expr = match[1]?.trim();
        if (!expr)
            continue;
        if (expr.startsWith("\"") || expr.startsWith("'"))
            continue;
        const fnMatch = expr.match(/^([\w\.]+)\(/);
        if (fnMatch) {
            if (!allowedFunctions.has(fnMatch[1])) {
                issues.push({
                    level: "warning",
                    nodeId: issueTarget.id,
                    message: `Unknown function '${fnMatch[1]}' in template`
                });
            }
            continue;
        }
        const root = expr.split(".")[0];
        if (root && !allowedRoots.has(root)) {
            issues.push({ level: "warning", nodeId: issueTarget.id, message: `Unknown variable root '${root}'` });
        }
    }
}
function validateWorkflow(graph) {
    const issues = [];
    if (!graph || !Array.isArray(graph.nodes)) {
        return [{ level: "error", message: "Workflow graph is empty" }];
    }
    if (graph.version !== constants_1.WORKFLOW_SCHEMA_VERSION) {
        issues.push({ level: "warning", message: `Workflow schema version mismatch. Expected ${constants_1.WORKFLOW_SCHEMA_VERSION}.` });
    }
    const triggerNodes = graph.nodes.filter((node) => node.type === "SlashCommandTrigger");
    if (triggerNodes.length === 0) {
        issues.push({ level: "error", message: "Missing SlashCommandTrigger node" });
    }
    if (triggerNodes.length > 1) {
        issues.push({ level: "error", message: "Only one SlashCommandTrigger node is allowed" });
    }
    const incomingCounts = {};
    const outgoingHandles = {};
    for (const edge of graph.edges) {
        incomingCounts[edge.target] = (incomingCounts[edge.target] ?? 0) + 1;
        const handle = edge.sourceHandle ?? "next";
        outgoingHandles[edge.source] = outgoingHandles[edge.source] ?? {};
        outgoingHandles[edge.source][handle] = (outgoingHandles[edge.source][handle] ?? 0) + 1;
    }
    for (const node of graph.nodes) {
        const req = requiredFields[node.type] ?? [];
        for (const field of req) {
            if (!hasRequired(node, field)) {
                issues.push({
                    level: "error",
                    nodeId: node.id,
                    message: `${node.type} is missing required field '${field}'`
                });
            }
        }
        const templates = templateFields[node.type] ?? [];
        for (const field of templates) {
            const value = node.data?.[field];
            if (typeof value === "string") {
                validateTemplate(node, value, issues);
            }
        }
        if (node.type !== "SlashCommandTrigger" && (incomingCounts[node.id] ?? 0) === 0) {
            issues.push({ level: "warning", nodeId: node.id, message: `${node.type} has no incoming connections` });
        }
        const handles = outgoingHandles[node.id] ?? {};
        if (node.type === "IfElse") {
            if (!handles.true)
                issues.push({ level: "error", nodeId: node.id, message: "IfElse missing 'true' output" });
            if (!handles.false)
                issues.push({ level: "error", nodeId: node.id, message: "IfElse missing 'false' output" });
        }
        if (node.type === "SwitchCase") {
            const hasCase = Object.keys(handles).some((key) => key.startsWith("case:"));
            if (!hasCase)
                issues.push({ level: "warning", nodeId: node.id, message: "SwitchCase has no case outputs" });
            if (!handles.default)
                issues.push({ level: "warning", nodeId: node.id, message: "SwitchCase missing 'default' output" });
        }
        if (node.type === "HttpRequest") {
            if (!handles.success)
                issues.push({ level: "warning", nodeId: node.id, message: "HttpRequest missing 'success' output" });
            if (!handles.failure)
                issues.push({ level: "warning", nodeId: node.id, message: "HttpRequest missing 'failure' output" });
        }
        if (node.type === "Loop") {
            if (!handles.loop)
                issues.push({ level: "warning", nodeId: node.id, message: "Loop missing 'loop' output" });
            if (!handles.done)
                issues.push({ level: "warning", nodeId: node.id, message: "Loop missing 'done' output" });
        }
    }
    return issues;
}
//# sourceMappingURL=validation.js.map