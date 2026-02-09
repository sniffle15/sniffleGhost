"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const src_1 = require("../src");
const baseContext = {
    botId: "bot-1",
    commandName: "hello",
    user: { id: "1", username: "Test" },
    guild: { id: "g1", name: "Guild" },
    channel: { id: "c1", name: "general" },
    options: {},
    memberRoles: ["admin"],
    variables: {}
};
const handlers = () => {
    const calls = [];
    return {
        calls,
        handlers: {
            reply: async (content) => {
                calls.push(`reply:${content}`);
            },
            sendChannel: async (channelId, content) => {
                calls.push(`channel:${channelId}:${content}`);
            },
            sendDm: async (content) => {
                calls.push(`dm:${content}`);
            },
            sendEmbed: async () => {
                calls.push("embed");
            },
            addRole: async () => {
                calls.push("addRole");
            },
            removeRole: async () => {
                calls.push("removeRole");
            },
            log: async (_level, message) => {
                calls.push(`log:${message}`);
            },
            httpRequest: async () => ({ status: 200, body: { ok: true } })
        }
    };
};
const variableStore = {
    async get() {
        return null;
    },
    async set() { }
};
(0, vitest_1.describe)("workflow validation", () => {
    (0, vitest_1.it)("fails without trigger", () => {
        const graph = { version: 1, nodes: [], edges: [] };
        const issues = (0, src_1.validateWorkflow)(graph);
        (0, vitest_1.expect)(issues.some((issue) => issue.message.includes("Missing SlashCommandTrigger"))).toBe(true);
    });
    (0, vitest_1.it)("warns for missing IfElse outputs", () => {
        const graph = {
            version: 1,
            nodes: [
                { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
                { id: "if", type: "IfElse", position: { x: 0, y: 0 }, data: { conditions: { op: "AND", rules: [] } } }
            ],
            edges: [{ id: "e1", source: "t", target: "if" }]
        };
        const issues = (0, src_1.validateWorkflow)(graph);
        (0, vitest_1.expect)(issues.some((issue) => issue.message.includes("IfElse missing 'true'"))).toBe(true);
    });
});
(0, vitest_1.describe)("workflow execution", () => {
    (0, vitest_1.it)("executes a simple reply", async () => {
        const graph = {
            version: 1,
            nodes: [
                { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
                { id: "r", type: "ReplyMessage", position: { x: 0, y: 0 }, data: { template: "Hello {{user.username}}" } },
                { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
            ],
            edges: [
                { id: "e1", source: "t", target: "r" },
                { id: "e2", source: "r", target: "s" }
            ]
        };
        const exec = (0, src_1.compileWorkflow)(graph);
        const { handlers: actionHandlers, calls } = handlers();
        const result = await (0, src_1.executeWorkflow)(exec, { ...baseContext }, actionHandlers, variableStore);
        (0, vitest_1.expect)(result.error).toBeUndefined();
        (0, vitest_1.expect)(calls[0]).toBe("reply:Hello Test");
    });
    (0, vitest_1.it)("routes IfElse based on conditions", async () => {
        const graph = {
            version: 1,
            nodes: [
                { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
                {
                    id: "if",
                    type: "IfElse",
                    position: { x: 0, y: 0 },
                    data: { conditions: { op: "AND", rules: [{ left: "user.username", operator: "equals", right: "Test" }] } }
                },
                { id: "r", type: "ReplyMessage", position: { x: 0, y: 0 }, data: { template: "Matched" } },
                { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
            ],
            edges: [
                { id: "e1", source: "t", target: "if" },
                { id: "e2", source: "if", sourceHandle: "true", target: "r" },
                { id: "e3", source: "if", sourceHandle: "false", target: "s" },
                { id: "e4", source: "r", target: "s" }
            ]
        };
        const exec = (0, src_1.compileWorkflow)(graph);
        const { handlers: actionHandlers, calls } = handlers();
        await (0, src_1.executeWorkflow)(exec, { ...baseContext }, actionHandlers, variableStore);
        (0, vitest_1.expect)(calls[0]).toBe("reply:Matched");
    });
    (0, vitest_1.it)("iterates loop items", async () => {
        const graph = {
            version: 1,
            nodes: [
                { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
                {
                    id: "l",
                    type: "Loop",
                    position: { x: 0, y: 0 },
                    data: { listExpression: "vars.items", itemVar: "item" }
                },
                { id: "log", type: "Logger", position: { x: 0, y: 0 }, data: { level: "info", message: "Item {{vars.item}}" } },
                { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
            ],
            edges: [
                { id: "e1", source: "t", target: "l" },
                { id: "e2", source: "l", sourceHandle: "loop", target: "log" },
                { id: "e3", source: "log", target: "l", targetHandle: "continue" },
                { id: "e4", source: "l", sourceHandle: "done", target: "s" }
            ]
        };
        const exec = (0, src_1.compileWorkflow)(graph);
        const { handlers: actionHandlers, calls } = handlers();
        await (0, src_1.executeWorkflow)(exec, { ...baseContext, variables: { items: ["a", "b"] } }, actionHandlers, variableStore);
        const loopLogs = calls.filter((entry) => entry.startsWith("log:"));
        (0, vitest_1.expect)(loopLogs).toEqual(["log:Item a", "log:Item b"]);
    });
});
