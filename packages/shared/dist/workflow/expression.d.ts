import type { ExecutionContext } from "./types";
export declare function getPathValue(obj: unknown, path: string): unknown;
export declare function renderTemplate(template: string, ctx: ExecutionContext): string;
export declare function evaluateCondition(operandLeft: string, operator: string, operandRight: string | undefined, ctx: ExecutionContext): boolean;
export declare function evaluateConditionGroup(group: any, ctx: ExecutionContext): boolean;
export declare function resolveTemplateValue(value: string | undefined, ctx: ExecutionContext): string;
export declare function resolveExpressionValue(value: string | undefined, ctx: ExecutionContext): unknown;
