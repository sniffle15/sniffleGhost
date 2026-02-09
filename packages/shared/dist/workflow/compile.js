"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileWorkflow = compileWorkflow;
function compileWorkflow(graph) {
    const nodes = {};
    for (const node of graph.nodes) {
        nodes[node.id] = node;
    }
    const edges = {};
    const loopContinuations = {};
    for (const edge of graph.edges) {
        const handle = edge.sourceHandle ?? "next";
        edges[edge.source] = edges[edge.source] ?? {};
        edges[edge.source][handle] = edge.target;
        if (edge.targetHandle === "continue") {
            loopContinuations[edge.source] = edge.target;
        }
    }
    const triggerTypes = new Set(["SlashCommandTrigger", "MessageCreateTrigger"]);
    const startNode = graph.nodes.find((node) => triggerTypes.has(node.type));
    if (!startNode) {
        throw new Error("Missing trigger node");
    }
    return {
        version: graph.version,
        startNodeId: startNode.id,
        nodes,
        edges,
        loopContinuations
    };
}
