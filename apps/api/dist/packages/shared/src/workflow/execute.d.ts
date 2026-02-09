import type { ActionHandlers, ExecutableWorkflow, ExecutionContext, ExecutionLimits, ExecutionResult, VariableStore } from "./types";
export declare function executeWorkflow(executable: ExecutableWorkflow, context: ExecutionContext, handlers: ActionHandlers, variableStore: VariableStore, limits?: Partial<ExecutionLimits>): Promise<ExecutionResult>;
