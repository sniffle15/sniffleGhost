import type { WorkflowGraph } from "./types";
export interface ValidationIssue {
    level: "error" | "warning";
    message: string;
    nodeId?: string;
}
export declare function validateWorkflow(graph: WorkflowGraph): ValidationIssue[];
