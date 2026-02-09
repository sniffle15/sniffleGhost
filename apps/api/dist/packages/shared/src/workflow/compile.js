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
    const startNode = graph.nodes.find((node) => node.type === "SlashCommandTrigger");
    if (!startNode) {
        throw new Error("Missing SlashCommandTrigger node");
    }
    return {
        version: graph.version,
        startNodeId: startNode.id,
        nodes,
        edges,
        loopContinuations
    };
}
//# sourceMappingURL=compile.js.map