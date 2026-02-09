import type { ExecutionContext } from "./types";

// test test test

const templatePattern = /\{\{\s*([^}]+)\s*\}\}/g;
const shorthandPattern = /(?<!{){([a-zA-Z0-9_.]+)}(?!})/g;

export function getPathValue(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".").filter(Boolean);
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function parseLiteral(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  // Keep long integer-like strings (e.g. Discord snowflake IDs) as strings.
  const integerPattern = /^-?\d+$/;
  if (integerPattern.test(trimmed) && trimmed.replace("-", "").length >= 15) {
    return undefined;
  }
  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "" && Number.isFinite(num)) return num;
  return undefined;
}

function splitArgs(args: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      }
      current += ch;
      continue;
    }
    if (ch === "\"" || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ",") {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) {
    result.push(current.trim());
  }
  return result;
}

function resolveOperand(operand: string, ctx: ExecutionContext): unknown {
  const literal = parseLiteral(operand);
  if (literal !== undefined) return literal;
  if (operand.includes("{{")) {
    const rendered = renderTemplate(operand, ctx);
    const renderedLiteral = parseLiteral(rendered);
    return renderedLiteral !== undefined ? renderedLiteral : rendered;
  }
  if (operand.startsWith("vars.")) {
    return getPathValue(ctx.variables, operand.replace(/^vars\./, ""));
  }
  if (operand.startsWith("variables.")) {
    return getPathValue(ctx.variables, operand.replace(/^variables\./, ""));
  }
  const contextValue = getPathValue(ctx as any, operand);
  if (contextValue !== undefined) return contextValue;
  return operand;
}

function resolveFunction(name: string, args: string[], ctx: ExecutionContext): unknown {
  const resolvedArgs = args.map((arg) => {
    const literal = parseLiteral(arg);
    if (literal !== undefined) return literal;
    return resolveOperand(arg, ctx);
  });

  switch (name) {
    case "upper":
      return String(resolvedArgs[0] ?? "").toUpperCase();
    case "lower":
      return String(resolvedArgs[0] ?? "").toLowerCase();
    case "toNumber":
      return Number(resolvedArgs[0] ?? 0);
    case "random": {
      const min = Number(resolvedArgs[0] ?? 0);
      const max = Number(resolvedArgs[1] ?? 1);
      return Math.random() * (max - min) + min;
    }
    case "now":
      return new Date().toISOString();
    case "format": {
      const value = resolvedArgs[0];
      if (!value) return "";
      const date = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toISOString();
    }
    case "json.path":
    case "jsonPath": {
      const obj = resolvedArgs[0];
      const path = String(resolvedArgs[1] ?? "");
      return getPathValue(obj, path);
    }
    default:
      return "";
  }
}

export function renderTemplate(template: string, ctx: ExecutionContext): string {
  const withShorthand = template.replace(shorthandPattern, (_match, token) => {
    const value = resolveShortcutToken(token, ctx);
    if (value !== undefined) return String(value);
    if (token.includes(".")) {
      const resolved = resolveOperand(token, ctx);
      return resolved === undefined ? "" : String(resolved);
    }
    return _match;
  });

  return withShorthand.replace(templatePattern, (_match, expr) => {
    const trimmed = String(expr).trim();
    const fnMatch = trimmed.match(/^([\w\.]+)\((.*)\)$/);
    if (fnMatch) {
      const [, fnName, rawArgs] = fnMatch;
      const args = splitArgs(rawArgs);
      const value = resolveFunction(fnName, args, ctx);
      return value === undefined ? "" : String(value);
    }
    const value = resolveOperand(trimmed, ctx);
    return value === undefined ? "" : String(value);
  });
}

function resolveShortcutToken(token: string, ctx: ExecutionContext): string | undefined {
  switch (token) {
    case "user":
      return ctx.user?.id ? `<@${ctx.user.id}>` : "";
    case "user_id":
      return ctx.user?.id ?? "";
    case "user_name":
      return ctx.user?.username ?? "";
    case "user_tag":
      return ctx.user?.discriminator ? `${ctx.user.username}#${ctx.user.discriminator}` : ctx.user?.username ?? "";
    case "channel":
      return ctx.channel?.id ? `<#${ctx.channel.id}>` : "";
    case "channel_id":
      return ctx.channel?.id ?? "";
    case "channel_name":
      return ctx.channel?.name ?? "";
    case "server":
      return ctx.guild?.name ?? "";
    case "server_id":
      return ctx.guild?.id ?? "";
    case "server_icon":
      return ctx.guild?.iconUrl ?? "";
    default:
      return undefined;
  }
}

export function evaluateCondition(operandLeft: string, operator: string, operandRight: string | undefined, ctx: ExecutionContext): boolean {
  const left = resolveOperand(operandLeft, ctx);
  const right = operandRight !== undefined ? resolveOperand(operandRight, ctx) : undefined;
  const normalizeMentionToId = (value: unknown): string => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const roleMatch = text.match(/^<@&(\d+)>$/);
    if (roleMatch) return roleMatch[1];
    const userMatch = text.match(/^<@!?(\d+)>$/);
    if (userMatch) return userMatch[1];
    const channelMatch = text.match(/^<#(\d+)>$/);
    if (channelMatch) return channelMatch[1];
    return text;
  };
  const splitCandidateValues = (value: unknown): string[] => {
    const normalized = normalizeMentionToId(value);
    if (!normalized) return [];
    return normalized
      .split(",")
      .map((item) => normalizeMentionToId(item))
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const normalizePermission = (value: unknown): string =>
    String(value ?? "")
      .trim()
      .replace(/[\s_]+/g, "")
      .toLowerCase();
  const isMentionLike = (value: unknown): boolean => /^<[@#]/.test(String(value ?? "").trim());
  const normalizedLeft = normalizeMentionToId(left);
  const normalizedRight = normalizeMentionToId(right);
  const compareWithMentionSupport = (): boolean => {
    if (left === right) return true;
    if (String(left ?? "") === String(right ?? "")) return true;
    if (isMentionLike(left) || isMentionLike(right)) {
      return normalizedLeft !== "" && normalizedLeft === normalizedRight;
    }
    return false;
  };

  switch (operator) {
    case "equals":
      return compareWithMentionSupport();
    case "notEquals":
      return !compareWithMentionSupport();
    case "contains":
      return String(left ?? "").includes(String(right ?? ""));
    case "startsWith":
      return String(left ?? "").startsWith(String(right ?? ""));
    case "endsWith":
      return String(left ?? "").endsWith(String(right ?? ""));
    case "gt":
      return Number(left) > Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "in":
      if (Array.isArray(right)) {
        if (right.includes(left as any)) return true;
        if (isMentionLike(left)) {
          return right.some((item) => normalizeMentionToId(item) === normalizedLeft);
        }
        return false;
      }
      return String(right ?? "").includes(String(left ?? ""));
    case "hasRole":
      if (Array.isArray(ctx.memberRoles)) {
        const memberRoleValues = ctx.memberRoles.map((role) => String(role ?? ""));
        const memberRoleLookup = new Set(memberRoleValues);
        const memberRoleLowerLookup = new Set(memberRoleValues.map((role) => role.toLowerCase()));
        const candidates = splitCandidateValues(right);
        return candidates.some(
          (candidate) =>
            memberRoleLookup.has(candidate) ||
            memberRoleLowerLookup.has(candidate.toLowerCase())
        );
      }
      return false;
    case "hasPermission":
      if (Array.isArray(ctx.memberRoles)) {
        const memberPermissionLookup = new Set(ctx.memberRoles.map((value) => normalizePermission(value)));
        const candidates = splitCandidateValues(right);
        return candidates.some((candidate) => memberPermissionLookup.has(normalizePermission(candidate)));
      }
      return false;
    default:
      return false;
  }
}

export function evaluateConditionGroup(group: any, ctx: ExecutionContext): boolean {
  if (!group) return true;
  const op = group.op === "OR" ? "OR" : "AND";
  const rules = Array.isArray(group.rules) ? group.rules : [];
  if (rules.length === 0) return true;
  if (op === "AND") {
    return rules.every((rule: any) => {
      if ("rules" in rule) return evaluateConditionGroup(rule, ctx);
      return evaluateCondition(rule.left, rule.operator, rule.right, ctx);
    });
  }
  return rules.some((rule: any) => {
    if ("rules" in rule) return evaluateConditionGroup(rule, ctx);
    return evaluateCondition(rule.left, rule.operator, rule.right, ctx);
  });
}

export function resolveTemplateValue(value: string | undefined, ctx: ExecutionContext): string {
  if (!value) return "";
  return renderTemplate(value, ctx);
}

export function resolveExpressionValue(value: string | undefined, ctx: ExecutionContext): unknown {
  if (!value) return undefined;
  if (value.includes("{{")) return renderTemplate(value, ctx);
  return resolveOperand(value, ctx);
}
