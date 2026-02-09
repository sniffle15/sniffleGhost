"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPathValue = getPathValue;
exports.renderTemplate = renderTemplate;
exports.evaluateCondition = evaluateCondition;
exports.evaluateConditionGroup = evaluateConditionGroup;
exports.resolveTemplateValue = resolveTemplateValue;
exports.resolveExpressionValue = resolveExpressionValue;
const templatePattern = /\{\{\s*([^}]+)\s*\}\}/g;
function getPathValue(obj, path) {
    if (!path)
        return undefined;
    const parts = path.split(".").filter(Boolean);
    let current = obj;
    for (const part of parts) {
        if (current == null)
            return undefined;
        current = current[part];
    }
    return current;
}
function parseLiteral(value) {
    const trimmed = value.trim();
    if (trimmed === "true")
        return true;
    if (trimmed === "false")
        return false;
    if (trimmed === "null")
        return null;
    if (trimmed === "undefined")
        return undefined;
    if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num) && trimmed !== "")
        return num;
    return undefined;
}
function splitArgs(args) {
    const result = [];
    let current = "";
    let quote = null;
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
function resolveOperand(operand, ctx) {
    const literal = parseLiteral(operand);
    if (literal !== undefined)
        return literal;
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
    const contextValue = getPathValue(ctx, operand);
    if (contextValue !== undefined)
        return contextValue;
    return operand;
}
function resolveFunction(name, args, ctx) {
    const resolvedArgs = args.map((arg) => {
        const literal = parseLiteral(arg);
        if (literal !== undefined)
            return literal;
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
            if (!value)
                return "";
            const date = value instanceof Date ? value : new Date(String(value));
            if (Number.isNaN(date.getTime()))
                return String(value);
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
function renderTemplate(template, ctx) {
    return template.replace(templatePattern, (_match, expr) => {
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
function evaluateCondition(operandLeft, operator, operandRight, ctx) {
    const left = resolveOperand(operandLeft, ctx);
    const right = operandRight !== undefined ? resolveOperand(operandRight, ctx) : undefined;
    switch (operator) {
        case "equals":
            return left === right;
        case "notEquals":
            return left !== right;
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
            if (Array.isArray(right))
                return right.includes(left);
            return String(right ?? "").includes(String(left ?? ""));
        case "hasRole":
            if (Array.isArray(ctx.memberRoles)) {
                return ctx.memberRoles.includes(String(right ?? ""));
            }
            return false;
        case "hasPermission":
            if (Array.isArray(ctx.memberRoles)) {
                return ctx.memberRoles.includes(String(right ?? ""));
            }
            return false;
        default:
            return false;
    }
}
function evaluateConditionGroup(group, ctx) {
    if (!group)
        return true;
    const op = group.op === "OR" ? "OR" : "AND";
    const rules = Array.isArray(group.rules) ? group.rules : [];
    if (rules.length === 0)
        return true;
    if (op === "AND") {
        return rules.every((rule) => {
            if ("rules" in rule)
                return evaluateConditionGroup(rule, ctx);
            return evaluateCondition(rule.left, rule.operator, rule.right, ctx);
        });
    }
    return rules.some((rule) => {
        if ("rules" in rule)
            return evaluateConditionGroup(rule, ctx);
        return evaluateCondition(rule.left, rule.operator, rule.right, ctx);
    });
}
function resolveTemplateValue(value, ctx) {
    if (!value)
        return "";
    return renderTemplate(value, ctx);
}
function resolveExpressionValue(value, ctx) {
    if (!value)
        return undefined;
    if (value.includes("{{"))
        return renderTemplate(value, ctx);
    return resolveOperand(value, ctx);
}
//# sourceMappingURL=expression.js.map