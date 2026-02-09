import type {
  ActionHandlers,
  ExecutableWorkflow,
  ExecutionContext,
  ExecutionEvent,
  ExecutionLimits,
  ExecutionResult,
  HttpRequestData,
  MessageButton,
  MessageSelectMenu,
  LoopData,
  VariableStore,
  WorkflowNode
} from "./types";
import { evaluateConditionGroup, resolveExpressionValue, resolveTemplateValue } from "./expression";

const defaultLimits: ExecutionLimits = {
  maxNodes: 200,
  maxDurationMs: 5000,
  maxLoopIterations: 50
};

interface LoopState {
  items: unknown[];
  index: number;
  itemVar: string;
  loopTarget?: string;
  doneTarget?: string;
  iterations: number;
}

function pushEvent(events: ExecutionEvent[], event: Omit<ExecutionEvent, "ts">): void {
  events.push({ ts: Date.now(), ...event });
}

function normalizeList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [value];
}

function getButtons(node: WorkflowNode): MessageButton[] {
  const buttons = (node.data as any)?.buttons;
  return Array.isArray(buttons) ? buttons : [];
}

function getSelectMenus(node: WorkflowNode): MessageSelectMenu[] {
  const selectMenus = (node.data as any)?.selectMenus;
  return Array.isArray(selectMenus) ? selectMenus : [];
}

function resolveButtons(buttons: MessageButton[], context: ExecutionContext): MessageButton[] {
  return buttons.map((button) => ({
    ...button,
    label: button.label ? resolveTemplateValue(String(button.label), context) : "",
    url: button.url ? resolveTemplateValue(String(button.url), context) : undefined
  }));
}

function resolveSelectMenus(selectMenus: MessageSelectMenu[], context: ExecutionContext): MessageSelectMenu[] {
  return selectMenus.map((menu) => ({
    ...menu,
    placeholder: menu.placeholder ? resolveTemplateValue(String(menu.placeholder), context) : undefined,
    options: (menu.options ?? []).map((option) => ({
      ...option,
      label: option.label ? resolveTemplateValue(String(option.label), context) : "",
      description: option.description ? resolveTemplateValue(String(option.description), context) : undefined,
      emoji: option.emoji ? resolveTemplateValue(String(option.emoji), context) : undefined
    }))
  }));
}

function hasButtonEdges(nodeId: string, buttons: MessageButton[], edges: Record<string, Record<string, string>>): boolean {
  return buttons.some((button) => Boolean(edges[nodeId]?.[`button:${button.id}`]));
}

function hasSelectEdges(nodeId: string, selectMenus: MessageSelectMenu[], edges: Record<string, Record<string, string>>): boolean {
  return selectMenus.some((menu) =>
    (menu.options ?? []).some((option) => Boolean(edges[nodeId]?.[`select:${menu.id}:${option.id}`]))
  );
}

async function runHttpRequest(data: HttpRequestData, handlers: ActionHandlers): Promise<{ status: number; body: unknown }> {
  return handlers.httpRequest(data);
}

export async function executeWorkflow(
  executable: ExecutableWorkflow,
  context: ExecutionContext,
  handlers: ActionHandlers,
  variableStore: VariableStore,
  limits: Partial<ExecutionLimits> = {}
): Promise<ExecutionResult> {
  const mergedLimits = { ...defaultLimits, ...limits };
  const events: ExecutionEvent[] = [];
  const startTime = Date.now();

  const loopStates: Record<string, LoopState> = {};
  const pendingLoopContinuation = new Set<string>();
  let currentNodeId: string | undefined = executable.startNodeId;
  let steps = 0;

  while (currentNodeId) {
    if (steps >= mergedLimits.maxNodes) {
      return { events, stopped: true, error: "Max node limit exceeded" };
    }
    if (Date.now() - startTime > mergedLimits.maxDurationMs) {
      return { events, stopped: true, error: "Max duration exceeded" };
    }

    const node: WorkflowNode | undefined = executable.nodes[currentNodeId];
    if (!node) {
      return { events, stopped: true, error: `Node not found: ${currentNodeId}` };
    }

    const isLoopContinuation = pendingLoopContinuation.has(node.id);
    if (isLoopContinuation) {
      pendingLoopContinuation.delete(node.id);
    }

    if (node.type === "Loop" && isLoopContinuation) {
      const loopState: LoopState | undefined = loopStates[node.id];
      if (!loopState) {
        currentNodeId = executable.edges[node.id]?.done;
        steps += 1;
        continue;
      }

      loopState.iterations += 1;
      if (loopState.iterations > mergedLimits.maxLoopIterations) {
        currentNodeId = loopState.doneTarget;
        pushEvent(events, { type: "error", nodeId: node.id, message: "Loop max iterations exceeded" });
        steps += 1;
        continue;
      }

      loopState.index += 1;
      if (loopState.index >= loopState.items.length) {
        currentNodeId = loopState.doneTarget;
        steps += 1;
        continue;
      }

      context.variables[loopState.itemVar] = loopState.items[loopState.index];
      currentNodeId = loopState.loopTarget;
      steps += 1;
      continue;
    }

    if (node.type === "Loop" && !isLoopContinuation) {
      const data = node.data as LoopData;
      const items = normalizeList(resolveExpressionValue(data.listExpression, context));
      const loopTarget = executable.edges[node.id]?.loop;
      const doneTarget = executable.edges[node.id]?.done;

      loopStates[node.id] = {
        items,
        index: 0,
        itemVar: data.itemVar,
        loopTarget,
        doneTarget,
        iterations: 0
      };

      if (!items.length) {
        currentNodeId = doneTarget;
        steps += 1;
        continue;
      }

      context.variables[data.itemVar] = items[0];
      currentNodeId = loopTarget;
      steps += 1;
      continue;
    }

    pushEvent(events, { type: "node:enter", nodeId: node.id });

    const nextHandle = "next";
    let nextNodeId: string | undefined = executable.edges[node.id]?.[nextHandle];
    const nodeButtonsRaw = getButtons(node);
    const nodeButtons = resolveButtons(nodeButtonsRaw, context);
    const nodeSelectMenusRaw = getSelectMenus(node);
    const nodeSelectMenus = resolveSelectMenus(nodeSelectMenusRaw, context);
    const hasButtons = nodeButtonsRaw.length > 0;
    const hasSelectMenus = nodeSelectMenusRaw.length > 0;
    const hasButtonEdge = hasButtons && hasButtonEdges(node.id, nodeButtonsRaw, executable.edges);
    const hasSelectEdge = hasSelectMenus && hasSelectEdges(node.id, nodeSelectMenusRaw, executable.edges);
    const shouldAwaitInteraction = (hasButtonEdge || hasSelectEdge) && typeof handlers.awaitInteraction === "function";
    const shouldRegisterInteraction = (hasButtonEdge || hasSelectEdge) && typeof handlers.registerInteraction === "function";
    const interactionRoutes = executable.edges[node.id] ?? {};

    if (node.data?.disabled) {
      pushEvent(events, { type: "log", nodeId: node.id, message: "Node disabled, skipping" });
      currentNodeId = nextNodeId;
      steps += 1;
      continue;
    }

    try {
      switch (node.type) {
        case "SlashCommandTrigger":
        case "MessageCreateTrigger":
          break;
        case "ReplyMessage": {
          const message = resolveTemplateValue((node.data as any).template, context);
          const messageRef = await handlers.reply(message, {
            ephemeral: (node.data as any).ephemeral,
            buttons: nodeButtons,
            selectMenus: nodeSelectMenus
          });
          pushEvent(events, { type: "action", nodeId: node.id, data: { action: "reply" } });
          if (shouldRegisterInteraction && handlers.registerInteraction && messageRef) {
            await handlers.registerInteraction({
              message: messageRef,
              nodeId: node.id,
              routes: interactionRoutes,
              buttons: nodeButtons,
              selectMenus: nodeSelectMenus,
              context: {
                ...context,
                variables: { ...context.variables }
              }
            });
          } else if (shouldAwaitInteraction && handlers.awaitInteraction) {
            const interactiveButtons = nodeButtons.filter((btn) => String(btn.style ?? "").toUpperCase() !== "LINK");
            const interactiveSelectMenus = nodeSelectMenus.filter((menu) => Array.isArray(menu.options) && menu.options.length > 0);
            const result = await handlers.awaitInteraction({
              message: messageRef,
              buttons: interactiveButtons,
              selectMenus: interactiveSelectMenus,
              userId: context.user.id
            });
            if (result?.kind === "button") {
              nextNodeId = executable.edges[node.id]?.[`button:${result.buttonId}`];
            } else if (result?.kind === "select") {
              const selectedMenu = nodeSelectMenusRaw.find((menu) => String(menu.id) === String(result.menuId));
              const selectedOption = selectedMenu?.options?.find((option) => String(option.value) === String(result.optionValue ?? ""));
              if (selectedMenu && selectedOption) {
                nextNodeId = executable.edges[node.id]?.[`select:${selectedMenu.id}:${selectedOption.id}`];
              }
            }
          }
          break;
        }
        case "SendChannelMessage": {
          const data = node.data as any;
          const message = resolveTemplateValue(data.template, context);
          const messageRef = await handlers.sendChannel(data.channelId, message, {
            buttons: nodeButtons,
            selectMenus: nodeSelectMenus
          });
          pushEvent(events, { type: "action", nodeId: node.id, data: { action: "sendChannel" } });
          if (shouldRegisterInteraction && handlers.registerInteraction && messageRef) {
            await handlers.registerInteraction({
              message: messageRef,
              nodeId: node.id,
              routes: interactionRoutes,
              buttons: nodeButtons,
              selectMenus: nodeSelectMenus,
              context: {
                ...context,
                variables: { ...context.variables }
              }
            });
          } else if (shouldAwaitInteraction && handlers.awaitInteraction) {
            const interactiveButtons = nodeButtons.filter((btn) => String(btn.style ?? "").toUpperCase() !== "LINK");
            const interactiveSelectMenus = nodeSelectMenus.filter((menu) => Array.isArray(menu.options) && menu.options.length > 0);
            const result = await handlers.awaitInteraction({
              message: messageRef,
              buttons: interactiveButtons,
              selectMenus: interactiveSelectMenus,
              userId: context.user.id
            });
            if (result?.kind === "button") {
              nextNodeId = executable.edges[node.id]?.[`button:${result.buttonId}`];
            } else if (result?.kind === "select") {
              const selectedMenu = nodeSelectMenusRaw.find((menu) => String(menu.id) === String(result.menuId));
              const selectedOption = selectedMenu?.options?.find((option) => String(option.value) === String(result.optionValue ?? ""));
              if (selectedMenu && selectedOption) {
                nextNodeId = executable.edges[node.id]?.[`select:${selectedMenu.id}:${selectedOption.id}`];
              }
            }
          }
          break;
        }
        case "SendDM": {
          const data = node.data as any;
          const message = resolveTemplateValue(data.template, context);
          const targetUserId = resolveTemplateValue(String(data.targetUserId ?? ""), context).trim() || undefined;
          const messageRef = await handlers.sendDm(message, {
            targetUserId,
            buttons: nodeButtons,
            selectMenus: nodeSelectMenus
          });
          pushEvent(events, { type: "action", nodeId: node.id, data: { action: "sendDm" } });
          if (shouldRegisterInteraction && handlers.registerInteraction && messageRef) {
            await handlers.registerInteraction({
              message: messageRef,
              nodeId: node.id,
              routes: interactionRoutes,
              buttons: nodeButtons,
              selectMenus: nodeSelectMenus,
              context: {
                ...context,
                variables: { ...context.variables }
              }
            });
          } else if (shouldAwaitInteraction && handlers.awaitInteraction) {
            const interactiveButtons = nodeButtons.filter((btn) => String(btn.style ?? "").toUpperCase() !== "LINK");
            const interactiveSelectMenus = nodeSelectMenus.filter((menu) => Array.isArray(menu.options) && menu.options.length > 0);
            const result = await handlers.awaitInteraction({
              message: messageRef,
              buttons: interactiveButtons,
              selectMenus: interactiveSelectMenus,
              userId: targetUserId ?? context.user.id
            });
            if (result?.kind === "button") {
              nextNodeId = executable.edges[node.id]?.[`button:${result.buttonId}`];
            } else if (result?.kind === "select") {
              const selectedMenu = nodeSelectMenusRaw.find((menu) => String(menu.id) === String(result.menuId));
              const selectedOption = selectedMenu?.options?.find((option) => String(option.value) === String(result.optionValue ?? ""));
              if (selectedMenu && selectedOption) {
                nextNodeId = executable.edges[node.id]?.[`select:${selectedMenu.id}:${selectedOption.id}`];
              }
            }
          }
          break;
        }
        case "EmbedMessage": {
          const data = node.data as any;
          const messageRef = await handlers.sendEmbed({
            ...data,
            title: resolveTemplateValue(data.title, context),
            description: resolveTemplateValue(data.description, context),
            url: resolveTemplateValue(data.url, context),
            footer: resolveTemplateValue(data.footer, context),
            footerIconUrl: resolveTemplateValue(data.footerIconUrl, context),
            authorName: resolveTemplateValue(data.authorName, context),
            authorUrl: resolveTemplateValue(data.authorUrl, context),
            authorIconUrl: resolveTemplateValue(data.authorIconUrl, context),
            thumbnailUrl: resolveTemplateValue(data.thumbnailUrl, context),
            imageUrl: resolveTemplateValue(data.imageUrl, context),
            timestamp: resolveTemplateValue(data.timestamp, context)
          }, {
            buttons: nodeButtons,
            selectMenus: nodeSelectMenus
          });
          pushEvent(events, { type: "action", nodeId: node.id, data: { action: "sendEmbed" } });
          if (shouldRegisterInteraction && handlers.registerInteraction && messageRef) {
            await handlers.registerInteraction({
              message: messageRef,
              nodeId: node.id,
              routes: interactionRoutes,
              buttons: nodeButtons,
              selectMenus: nodeSelectMenus,
              context: {
                ...context,
                variables: { ...context.variables }
              }
            });
          } else if (shouldAwaitInteraction && handlers.awaitInteraction) {
            const interactiveButtons = nodeButtons.filter((btn) => String(btn.style ?? "").toUpperCase() !== "LINK");
            const interactiveSelectMenus = nodeSelectMenus.filter((menu) => Array.isArray(menu.options) && menu.options.length > 0);
            const result = await handlers.awaitInteraction({
              message: messageRef,
              buttons: interactiveButtons,
              selectMenus: interactiveSelectMenus,
              userId: context.user.id
            });
            if (result?.kind === "button") {
              nextNodeId = executable.edges[node.id]?.[`button:${result.buttonId}`];
            } else if (result?.kind === "select") {
              const selectedMenu = nodeSelectMenusRaw.find((menu) => String(menu.id) === String(result.menuId));
              const selectedOption = selectedMenu?.options?.find((option) => String(option.value) === String(result.optionValue ?? ""));
              if (selectedMenu && selectedOption) {
                nextNodeId = executable.edges[node.id]?.[`select:${selectedMenu.id}:${selectedOption.id}`];
              }
            }
          }
          break;
        }
        case "IfElse": {
          const data = node.data as any;
          const result = evaluateConditionGroup(data.conditions, context);
          nextNodeId = executable.edges[node.id]?.[result ? "true" : "false"];
          break;
        }
        case "SwitchCase": {
          const data = node.data as any;
          const value = resolveExpressionValue(data.expression, context);
          const handle = `case:${String(value)}`;
          nextNodeId = executable.edges[node.id]?.[handle];
          if (!nextNodeId) {
            nextNodeId = executable.edges[node.id]?.default;
          }
          break;
        }
        case "SetVariable": {
          const data = node.data as any;
          const value = resolveExpressionValue(data.value, context);
          context.variables[data.name] = value;
          break;
        }
        case "GetPersistentVariable": {
          const data = node.data as any;
          const value = await variableStore.get(data.scope, data.key);
          context.variables[data.assignTo] = value ?? data.defaultValue ?? null;
          break;
        }
        case "SetPersistentVariable": {
          const data = node.data as any;
          const value = resolveExpressionValue(data.value, context);
          await variableStore.set(data.scope, data.key, value);
          break;
        }
        case "Delay": {
          const ms = Number((node.data as any).ms ?? 0);
          await new Promise((resolve) => setTimeout(resolve, ms));
          break;
        }
        case "HttpRequest": {
          const data = node.data as HttpRequestData;
          const response = await runHttpRequest(data, handlers);
          if (data.responseVar) {
            context.variables[data.responseVar] = response.body;
          }
          nextNodeId = response.status >= 200 && response.status < 300
            ? executable.edges[node.id]?.success
            : executable.edges[node.id]?.failure;
          break;
        }
        case "AddRole": {
          const data = node.data as any;
          const roleId = resolveTemplateValue(String(data.roleId ?? ""), context).trim();
          const reason = resolveTemplateValue(String(data.reason ?? ""), context).trim() || undefined;
          const targetUserId = resolveTemplateValue(String(data.targetUserId ?? ""), context).trim() || undefined;
          await handlers.addRole(roleId, { reason, targetUserId });
          break;
        }
        case "RemoveRole": {
          const data = node.data as any;
          const roleId = resolveTemplateValue(String(data.roleId ?? ""), context).trim();
          const reason = resolveTemplateValue(String(data.reason ?? ""), context).trim() || undefined;
          const targetUserId = resolveTemplateValue(String(data.targetUserId ?? ""), context).trim() || undefined;
          await handlers.removeRole(roleId, { reason, targetUserId });
          break;
        }
        case "Logger": {
          const data = node.data as any;
          await handlers.log(data.level, resolveTemplateValue(data.message, context));
          break;
        }
        case "Stop": {
          pushEvent(events, { type: "log", nodeId: node.id, message: "Workflow stopped" });
          return { events, stopped: true };
        }
        default:
          break;
      }
    } catch (error: any) {
      pushEvent(events, { type: "error", nodeId: node.id, message: error?.message ?? "Execution error" });
      return { events, stopped: true, error: error?.message ?? "Execution error" };
    }

    pushEvent(events, { type: "node:exit", nodeId: node.id });

    if (nextNodeId && executable.loopContinuations && executable.loopContinuations[node.id]) {
      const continuationTarget = executable.loopContinuations[node.id];
      if (nextNodeId === continuationTarget) {
        pendingLoopContinuation.add(continuationTarget);
      }
    }

    currentNodeId = nextNodeId;
    steps += 1;
  }

  return { events, stopped: true };
}
