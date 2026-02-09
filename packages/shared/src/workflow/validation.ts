import { WORKFLOW_SCHEMA_VERSION } from "../constants";
import type { NodeType, WorkflowGraph, WorkflowNode } from "./types";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
  nodeId?: string;
}

const requiredFields: Partial<Record<NodeType, string[]>> = {
  SlashCommandTrigger: ["commandName"],
  MessageCreateTrigger: ["eventType"],
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

const templateFields: Partial<Record<NodeType, string[]>> = {
  ReplyMessage: ["template"],
  SendChannelMessage: ["template"],
  SendDM: ["template", "targetUserId"],
  EmbedMessage: ["title", "description", "footer", "url", "footerIconUrl", "authorName", "authorUrl", "authorIconUrl", "thumbnailUrl", "imageUrl", "timestamp"],
  Logger: ["message"],
  SetVariable: ["value"],
  SetPersistentVariable: ["value"],
  HttpRequest: ["body"],
  AddRole: ["roleId", "reason", "targetUserId"],
  RemoveRole: ["roleId", "reason", "targetUserId"]
};

function validateButtons(node: WorkflowNode, issues: ValidationIssue[]) {
  const buttons = (node.data as any)?.buttons;
  if (!Array.isArray(buttons)) return;
  buttons.forEach((button: any, index: number) => {
    if (!button?.label) {
      issues.push({
        level: "error",
        nodeId: node.id,
        message: `Button #${index + 1} is missing a label`
      });
      return;
    }
    const style = String(button.style ?? "SECONDARY").toUpperCase();
    if (style === "LINK") {
      if (!button.url) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: `Button '${button.label}' is missing a URL`
        });
      }
    }
  });
}

function validateSelectMenus(node: WorkflowNode, issues: ValidationIssue[]) {
  const selectMenus = (node.data as any)?.selectMenus;
  if (!Array.isArray(selectMenus)) return;

  const menuIds = new Set<string>();
  selectMenus.forEach((menu: any, menuIndex: number) => {
    const menuId = String(menu?.id ?? "").trim();
    if (!menuId) {
      issues.push({
        level: "error",
        nodeId: node.id,
        message: `Select menu #${menuIndex + 1} is missing an id`
      });
      return;
    }
    if (menuIds.has(menuId)) {
      issues.push({
        level: "error",
        nodeId: node.id,
        message: `Select menu id '${menuId}' is duplicated`
      });
    }
    menuIds.add(menuId);

    const options = Array.isArray(menu.options) ? menu.options : [];
    if (options.length === 0) {
      issues.push({
        level: "error",
        nodeId: node.id,
        message: `Select menu '${menuId}' has no options`
      });
      return;
    }

    const optionIds = new Set<string>();
    const optionValues = new Set<string>();
    options.forEach((option: any, optionIndex: number) => {
      const optionId = String(option?.id ?? "").trim();
      const optionValue = String(option?.value ?? "").trim();
      if (!option?.label) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: `Select menu '${menuId}' option #${optionIndex + 1} is missing a label`
        });
      }
      if (!optionId) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: `Select menu '${menuId}' option #${optionIndex + 1} is missing an id`
        });
      }
      if (!optionValue) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: `Select menu '${menuId}' option '${option?.label ?? optionIndex + 1}' is missing a value`
        });
      }
      if (optionId) {
        if (optionIds.has(optionId)) {
          issues.push({
            level: "error",
            nodeId: node.id,
            message: `Select menu '${menuId}' has duplicated option id '${optionId}'`
          });
        }
        optionIds.add(optionId);
      }
      if (optionValue) {
        if (optionValues.has(optionValue)) {
          issues.push({
            level: "error",
            nodeId: node.id,
            message: `Select menu '${menuId}' has duplicated option value '${optionValue}'`
          });
        }
        optionValues.add(optionValue);
      }
    });
  });
}

const allowedRoots = new Set(["user", "guild", "channel", "options", "vars", "variables", "memberRoles"]);
const allowedFunctions = new Set(["upper", "lower", "toNumber", "random", "now", "format", "json.path", "jsonPath"]);

function hasRequired(node: WorkflowNode, field: string): boolean {
  return node.data && (node.data as any)[field] !== undefined && (node.data as any)[field] !== "";
}

function validateTemplate(issueTarget: WorkflowNode, value: string, issues: ValidationIssue[]) {
  const matches = value.matchAll(/\{\{\s*([^}]+)\s*\}\}/g);
  for (const match of matches) {
    const expr = match[1]?.trim();
    if (!expr) continue;
    if (expr.startsWith("\"") || expr.startsWith("'")) continue;
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

export function validateWorkflow(graph: WorkflowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!graph || !Array.isArray(graph.nodes)) {
    return [{ level: "error", message: "Workflow graph is empty" }];
  }

  if (graph.version !== WORKFLOW_SCHEMA_VERSION) {
    issues.push({ level: "warning", message: `Workflow schema version mismatch. Expected ${WORKFLOW_SCHEMA_VERSION}.` });
  }

  const triggerNodes = graph.nodes.filter(
    (node) => node.type === "SlashCommandTrigger" || node.type === "MessageCreateTrigger"
  );
  if (triggerNodes.length === 0) {
    issues.push({ level: "error", message: "Missing trigger node" });
  }
  if (triggerNodes.length > 1) {
    issues.push({ level: "error", message: "Only one trigger node is allowed" });
  }

  const incomingCounts: Record<string, number> = {};
  const outgoingHandles: Record<string, Record<string, number>> = {};

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
      const value = (node.data as any)?.[field];
      if (typeof value === "string") {
        validateTemplate(node, value, issues);
      }
    }

    validateButtons(node, issues);
    validateSelectMenus(node, issues);

    if (node.type === "EmbedMessage") {
      const data = node.data as any;
      const hasFields = Array.isArray(data.fields) && data.fields.length > 0;
      const hasContent = Boolean(
        data.title ||
        data.description ||
        data.url ||
        data.footer ||
        data.thumbnailUrl ||
        data.imageUrl ||
        data.authorName ||
        hasFields
      );
      if (!hasContent) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: "EmbedMessage needs at least a title, description, author, image, or field"
        });
      }
      if ((data.footerIconUrl && !data.footer) || (data.footerIconUrl && String(data.footer).trim() === "")) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: "Embed footer icon requires footer text"
        });
      }
      if ((data.authorIconUrl || data.authorUrl) && !data.authorName) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: "Embed author URL/icon requires author name"
        });
      }
      if (hasFields) {
        data.fields.forEach((field: any, index: number) => {
          if (!field?.name) {
            issues.push({
              level: "error",
              nodeId: node.id,
              message: `Embed field #${index + 1} is missing a name`
            });
          }
          if (!field?.value) {
            issues.push({
              level: "error",
              nodeId: node.id,
              message: `Embed field #${index + 1} is missing a value`
            });
          }
        });
      }
    }

    if (node.type !== "SlashCommandTrigger" && node.type !== "MessageCreateTrigger" && (incomingCounts[node.id] ?? 0) === 0) {
      issues.push({ level: "warning", nodeId: node.id, message: `${node.type} has no incoming connections` });
    }

    const handles = outgoingHandles[node.id] ?? {};
    if (node.type === "IfElse") {
      if (!handles.true) issues.push({ level: "error", nodeId: node.id, message: "IfElse missing 'true' output" });
      if (!handles.false) issues.push({ level: "error", nodeId: node.id, message: "IfElse missing 'false' output" });
    }
    if (node.type === "SwitchCase") {
      const hasCase = Object.keys(handles).some((key) => key.startsWith("case:"));
      if (!hasCase) issues.push({ level: "warning", nodeId: node.id, message: "SwitchCase has no case outputs" });
      if (!handles.default) issues.push({ level: "warning", nodeId: node.id, message: "SwitchCase missing 'default' output" });
    }
    if (node.type === "HttpRequest") {
      if (!handles.success) issues.push({ level: "warning", nodeId: node.id, message: "HttpRequest missing 'success' output" });
      if (!handles.failure) issues.push({ level: "warning", nodeId: node.id, message: "HttpRequest missing 'failure' output" });
    }
    if (node.type === "Loop") {
      if (!handles.loop) issues.push({ level: "warning", nodeId: node.id, message: "Loop missing 'loop' output" });
      if (!handles.done) issues.push({ level: "warning", nodeId: node.id, message: "Loop missing 'done' output" });
    }
    if (node.type === "ReplyMessage" || node.type === "SendChannelMessage" || node.type === "SendDM" || node.type === "EmbedMessage") {
      const buttons = Array.isArray((node.data as any)?.buttons) ? (node.data as any).buttons : [];
      const selectMenus = Array.isArray((node.data as any)?.selectMenus) ? (node.data as any).selectMenus : [];
      buttons
        .filter((button: any) => String(button?.style ?? "").toUpperCase() !== "LINK")
        .forEach((button: any) => {
          const key = `button:${button.id}`;
          if (!handles[key]) {
            issues.push({
              level: "warning",
              nodeId: node.id,
              message: `Button '${button.label ?? button.id}' has no output connection`
            });
          }
        });

      selectMenus.forEach((menu: any) => {
        const options = Array.isArray(menu.options) ? menu.options : [];
        options.forEach((option: any) => {
          const key = `select:${menu.id}:${option.id}`;
          if (!handles[key]) {
            issues.push({
              level: "warning",
              nodeId: node.id,
              message: `Select option '${option.label ?? option.id}' in menu '${menu.id}' has no output connection`
            });
          }
        });
      });
    }
  }

  return issues;
}
