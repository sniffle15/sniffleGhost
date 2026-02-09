import { describe, expect, it } from "vitest";
import {
  compileWorkflow,
  executeWorkflow,
  validateWorkflow,
  type ExecutionContext,
  type WorkflowGraph
} from "../src";

const baseContext: ExecutionContext = {
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
  const calls: string[] = [];
  return {
    calls,
    handlers: {
      reply: async (content: string) => {
        calls.push(`reply:${content}`);
      },
      sendChannel: async (channelId: string, content: string) => {
        calls.push(`channel:${channelId}:${content}`);
      },
      sendDm: async (content: string, options?: { targetUserId?: string }) => {
        calls.push(`dm:${options?.targetUserId ?? "self"}:${content}`);
      },
      sendEmbed: async () => {
        calls.push("embed");
      },
      addRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
        calls.push(`addRole:${roleId}:${options?.targetUserId ?? "self"}:${options?.reason ?? ""}`);
      },
      removeRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
        calls.push(`removeRole:${roleId}:${options?.targetUserId ?? "self"}:${options?.reason ?? ""}`);
      },
      log: async (_level: any, message: string) => {
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
  async set() {}
};

describe("workflow validation", () => {
  it("fails without trigger", () => {
    const graph: WorkflowGraph = { version: 1, nodes: [], edges: [] };
    const issues = validateWorkflow(graph);
    expect(issues.some((issue) => issue.message.includes("Missing SlashCommandTrigger"))).toBe(true);
  });

  it("warns for missing IfElse outputs", () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        { id: "if", type: "IfElse", position: { x: 0, y: 0 }, data: { conditions: { op: "AND", rules: [] } } }
      ],
      edges: [{ id: "e1", source: "t", target: "if" }]
    };
    const issues = validateWorkflow(graph);
    expect(issues.some((issue) => issue.message.includes("IfElse missing 'true'"))).toBe(true);
  });
});

describe("workflow execution", () => {
  it("executes a simple reply", async () => {
    const graph: WorkflowGraph = {
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

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    const result = await executeWorkflow(exec, { ...baseContext }, actionHandlers, variableStore);

    expect(result.error).toBeUndefined();
    expect(calls[0]).toBe("reply:Hello Test");
  });

  it("routes IfElse based on conditions", async () => {
    const graph: WorkflowGraph = {
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

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    await executeWorkflow(exec, { ...baseContext }, actionHandlers, variableStore);

    expect(calls[0]).toBe("reply:Matched");
  });

  it("supports role ids and role mentions in hasRole conditions", async () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        {
          id: "if",
          type: "IfElse",
          position: { x: 0, y: 0 },
          data: { conditions: { op: "AND", rules: [{ left: "memberRoles", operator: "hasRole", right: "<@&123456789012345678>" }] } }
        },
        { id: "r", type: "ReplyMessage", position: { x: 0, y: 0 }, data: { template: "Role matched" } },
        { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "t", target: "if" },
        { id: "e2", source: "if", sourceHandle: "true", target: "r" },
        { id: "e3", source: "if", sourceHandle: "false", target: "s" },
        { id: "e4", source: "r", target: "s" }
      ]
    };

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    await executeWorkflow(
      exec,
      { ...baseContext, memberRoles: ["admin", "123456789012345678"] },
      actionHandlers,
      variableStore
    );

    expect(calls[0]).toBe("reply:Role matched");
  });

  it("matches plain role id strings without numeric precision loss", async () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        {
          id: "if",
          type: "IfElse",
          position: { x: 0, y: 0 },
          data: { conditions: { op: "AND", rules: [{ left: "memberRoles", operator: "hasRole", right: "123456789012345678" }] } }
        },
        { id: "r", type: "ReplyMessage", position: { x: 0, y: 0 }, data: { template: "Role id matched" } },
        { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "t", target: "if" },
        { id: "e2", source: "if", sourceHandle: "true", target: "r" },
        { id: "e3", source: "if", sourceHandle: "false", target: "s" },
        { id: "e4", source: "r", target: "s" }
      ]
    };

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    await executeWorkflow(
      exec,
      { ...baseContext, memberRoles: ["admin", "123456789012345678"] },
      actionHandlers,
      variableStore
    );

    expect(calls[0]).toBe("reply:Role id matched");
  });

  it("supports role condition scoped to a specific user id", async () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        {
          id: "if",
          type: "IfElse",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              op: "AND",
              rules: [
                { left: "memberRoles", operator: "hasRole", right: "Admin" },
                { left: "user.id", operator: "equals", right: "1" }
              ]
            }
          }
        },
        { id: "r", type: "ReplyMessage", position: { x: 0, y: 0 }, data: { template: "Scoped match" } },
        { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "t", target: "if" },
        { id: "e2", source: "if", sourceHandle: "true", target: "r" },
        { id: "e3", source: "if", sourceHandle: "false", target: "s" },
        { id: "e4", source: "r", target: "s" }
      ]
    };

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    await executeWorkflow(exec, { ...baseContext, memberRoles: ["Admin"] }, actionHandlers, variableStore);

    expect(calls[0]).toBe("reply:Scoped match");
  });

  it("iterates loop items", async () => {
    const graph: WorkflowGraph = {
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

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    await executeWorkflow(exec, { ...baseContext, variables: { items: ["a", "b"] } }, actionHandlers, variableStore);

    const loopLogs = calls.filter((entry) => entry.startsWith("log:"));
    expect(loopLogs).toEqual(["log:Item a", "log:Item b"]);
  });

  it("routes by select menu option", async () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        {
          id: "r",
          type: "ReplyMessage",
          position: { x: 0, y: 0 },
          data: {
            template: "Choose",
            selectMenus: [
              {
                id: "menu_1",
                options: [
                  { id: "opt_yes", label: "Yes", value: "yes" },
                  { id: "opt_no", label: "No", value: "no" }
                ]
              }
            ]
          }
        },
        { id: "yes", type: "Logger", position: { x: 0, y: 0 }, data: { level: "info", message: "YES" } },
        { id: "no", type: "Logger", position: { x: 0, y: 0 }, data: { level: "info", message: "NO" } },
        { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "t", target: "r" },
        { id: "e2", source: "r", sourceHandle: "select:menu_1:opt_yes", target: "yes" },
        { id: "e3", source: "r", sourceHandle: "select:menu_1:opt_no", target: "no" },
        { id: "e4", source: "yes", target: "s" },
        { id: "e5", source: "no", target: "s" }
      ]
    };

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    const result = await executeWorkflow(
      exec,
      { ...baseContext },
      {
        ...actionHandlers,
        reply: async () => ({ id: "msg_1" }),
        awaitInteraction: async () => ({ kind: "select", menuId: "menu_1", optionValue: "yes" })
      },
      variableStore
    );

    expect(result.error).toBeUndefined();
    expect(calls.includes("log:YES")).toBe(true);
    expect(calls.includes("log:NO")).toBe(false);
  });

  it("sends DM to configured target user id", async () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        {
          id: "dm",
          type: "SendDM",
          position: { x: 0, y: 0 },
          data: { template: "Hi {{user.username}}", targetUserId: "999999999999999999" }
        },
        { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "t", target: "dm" },
        { id: "e2", source: "dm", target: "s" }
      ]
    };

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    const result = await executeWorkflow(exec, { ...baseContext }, actionHandlers, variableStore);

    expect(result.error).toBeUndefined();
    expect(calls).toContain("dm:999999999999999999:Hi Test");
  });

  it("assigns role to configured target user id", async () => {
    const graph: WorkflowGraph = {
      version: 1,
      nodes: [
        { id: "t", type: "SlashCommandTrigger", position: { x: 0, y: 0 }, data: { commandName: "hello" } },
        {
          id: "add",
          type: "AddRole",
          position: { x: 0, y: 0 },
          data: { roleId: "777777777777777777", targetUserId: "888888888888888888", reason: "manual assign" }
        },
        { id: "s", type: "Stop", position: { x: 0, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "t", target: "add" },
        { id: "e2", source: "add", target: "s" }
      ]
    };

    const exec = compileWorkflow(graph);
    const { handlers: actionHandlers, calls } = handlers();
    const result = await executeWorkflow(exec, { ...baseContext }, actionHandlers, variableStore);

    expect(result.error).toBeUndefined();
    expect(calls).toContain("addRole:777777777777777777:888888888888888888:manual assign");
  });
});
