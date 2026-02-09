"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWorkflow = executeWorkflow;
const expression_1 = require("./expression");
const defaultLimits = {
    maxNodes: 200,
    maxDurationMs: 5000,
    maxLoopIterations: 50
};
function pushEvent(events, event) {
    events.push({ ts: Date.now(), ...event });
}
function normalizeList(value) {
    if (Array.isArray(value))
        return value;
    if (value === undefined || value === null)
        return [];
    if (typeof value === "string")
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    return [value];
}
function getButtons(node) {
    const buttons = node.data?.buttons;
    return Array.isArray(buttons) ? buttons : [];
}
function getSelectMenus(node) {
    const selectMenus = node.data?.selectMenus;
    return Array.isArray(selectMenus) ? selectMenus : [];
}
function resolveButtons(buttons, context) {
    return buttons.map((button) => ({
        ...button,
        label: button.label ? (0, expression_1.resolveTemplateValue)(String(button.label), context) : "",
        url: button.url ? (0, expression_1.resolveTemplateValue)(String(button.url), context) : undefined
    }));
}
function resolveSelectMenus(selectMenus, context) {
    return selectMenus.map((menu) => ({
        ...menu,
        placeholder: menu.placeholder ? (0, expression_1.resolveTemplateValue)(String(menu.placeholder), context) : undefined,
        options: (menu.options ?? []).map((option) => ({
            ...option,
            label: option.label ? (0, expression_1.resolveTemplateValue)(String(option.label), context) : "",
            description: option.description ? (0, expression_1.resolveTemplateValue)(String(option.description), context) : undefined,
            emoji: option.emoji ? (0, expression_1.resolveTemplateValue)(String(option.emoji), context) : undefined
        }))
    }));
}
function hasButtonEdges(nodeId, buttons, edges) {
    return buttons.some((button) => Boolean(edges[nodeId]?.[`button:${button.id}`]));
}
function hasSelectEdges(nodeId, selectMenus, edges) {
    return selectMenus.some((menu) => (menu.options ?? []).some((option) => Boolean(edges[nodeId]?.[`select:${menu.id}:${option.id}`])));
}
async function runHttpRequest(data, handlers) {
    return handlers.httpRequest(data);
}
async function executeWorkflow(executable, context, handlers, variableStore, limits = {}) {
    const mergedLimits = { ...defaultLimits, ...limits };
    const events = [];
    const startTime = Date.now();
    const loopStates = {};
    const pendingLoopContinuation = new Set();
    let currentNodeId = executable.startNodeId;
    let steps = 0;
    while (currentNodeId) {
        if (steps >= mergedLimits.maxNodes) {
            return { events, stopped: true, error: "Max node limit exceeded" };
        }
        if (Date.now() - startTime > mergedLimits.maxDurationMs) {
            return { events, stopped: true, error: "Max duration exceeded" };
        }
        const node = executable.nodes[currentNodeId];
        if (!node) {
            return { events, stopped: true, error: `Node not found: ${currentNodeId}` };
        }
        const isLoopContinuation = pendingLoopContinuation.has(node.id);
        if (isLoopContinuation) {
            pendingLoopContinuation.delete(node.id);
        }
        if (node.type === "Loop" && isLoopContinuation) {
            const loopState = loopStates[node.id];
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
            const data = node.data;
            const items = normalizeList((0, expression_1.resolveExpressionValue)(data.listExpression, context));
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
        let nextNodeId = executable.edges[node.id]?.[nextHandle];
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
                    const message = (0, expression_1.resolveTemplateValue)(node.data.template, context);
                    const messageRef = await handlers.reply(message, {
                        ephemeral: node.data.ephemeral,
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
                    }
                    else if (shouldAwaitInteraction && handlers.awaitInteraction) {
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
                        }
                        else if (result?.kind === "select") {
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
                    const data = node.data;
                    const message = (0, expression_1.resolveTemplateValue)(data.template, context);
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
                    }
                    else if (shouldAwaitInteraction && handlers.awaitInteraction) {
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
                        }
                        else if (result?.kind === "select") {
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
                    const data = node.data;
                    const message = (0, expression_1.resolveTemplateValue)(data.template, context);
                    const targetUserId = (0, expression_1.resolveTemplateValue)(String(data.targetUserId ?? ""), context).trim() || undefined;
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
                    }
                    else if (shouldAwaitInteraction && handlers.awaitInteraction) {
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
                        }
                        else if (result?.kind === "select") {
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
                    const data = node.data;
                    const messageRef = await handlers.sendEmbed({
                        ...data,
                        title: (0, expression_1.resolveTemplateValue)(data.title, context),
                        description: (0, expression_1.resolveTemplateValue)(data.description, context),
                        url: (0, expression_1.resolveTemplateValue)(data.url, context),
                        footer: (0, expression_1.resolveTemplateValue)(data.footer, context),
                        footerIconUrl: (0, expression_1.resolveTemplateValue)(data.footerIconUrl, context),
                        authorName: (0, expression_1.resolveTemplateValue)(data.authorName, context),
                        authorUrl: (0, expression_1.resolveTemplateValue)(data.authorUrl, context),
                        authorIconUrl: (0, expression_1.resolveTemplateValue)(data.authorIconUrl, context),
                        thumbnailUrl: (0, expression_1.resolveTemplateValue)(data.thumbnailUrl, context),
                        imageUrl: (0, expression_1.resolveTemplateValue)(data.imageUrl, context),
                        timestamp: (0, expression_1.resolveTemplateValue)(data.timestamp, context)
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
                    }
                    else if (shouldAwaitInteraction && handlers.awaitInteraction) {
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
                        }
                        else if (result?.kind === "select") {
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
                    const data = node.data;
                    const result = (0, expression_1.evaluateConditionGroup)(data.conditions, context);
                    nextNodeId = executable.edges[node.id]?.[result ? "true" : "false"];
                    break;
                }
                case "SwitchCase": {
                    const data = node.data;
                    const value = (0, expression_1.resolveExpressionValue)(data.expression, context);
                    const handle = `case:${String(value)}`;
                    nextNodeId = executable.edges[node.id]?.[handle];
                    if (!nextNodeId) {
                        nextNodeId = executable.edges[node.id]?.default;
                    }
                    break;
                }
                case "SetVariable": {
                    const data = node.data;
                    const value = (0, expression_1.resolveExpressionValue)(data.value, context);
                    context.variables[data.name] = value;
                    break;
                }
                case "GetPersistentVariable": {
                    const data = node.data;
                    const value = await variableStore.get(data.scope, data.key);
                    context.variables[data.assignTo] = value ?? data.defaultValue ?? null;
                    break;
                }
                case "SetPersistentVariable": {
                    const data = node.data;
                    const value = (0, expression_1.resolveExpressionValue)(data.value, context);
                    await variableStore.set(data.scope, data.key, value);
                    break;
                }
                case "Delay": {
                    const ms = Number(node.data.ms ?? 0);
                    await new Promise((resolve) => setTimeout(resolve, ms));
                    break;
                }
                case "HttpRequest": {
                    const data = node.data;
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
                    const data = node.data;
                    const roleId = (0, expression_1.resolveTemplateValue)(String(data.roleId ?? ""), context).trim();
                    const reason = (0, expression_1.resolveTemplateValue)(String(data.reason ?? ""), context).trim() || undefined;
                    const targetUserId = (0, expression_1.resolveTemplateValue)(String(data.targetUserId ?? ""), context).trim() || undefined;
                    await handlers.addRole(roleId, { reason, targetUserId });
                    break;
                }
                case "RemoveRole": {
                    const data = node.data;
                    const roleId = (0, expression_1.resolveTemplateValue)(String(data.roleId ?? ""), context).trim();
                    const reason = (0, expression_1.resolveTemplateValue)(String(data.reason ?? ""), context).trim() || undefined;
                    const targetUserId = (0, expression_1.resolveTemplateValue)(String(data.targetUserId ?? ""), context).trim() || undefined;
                    await handlers.removeRole(roleId, { reason, targetUserId });
                    break;
                }
                case "Logger": {
                    const data = node.data;
                    await handlers.log(data.level, (0, expression_1.resolveTemplateValue)(data.message, context));
                    break;
                }
                case "Stop": {
                    pushEvent(events, { type: "log", nodeId: node.id, message: "Workflow stopped" });
                    return { events, stopped: true };
                }
                default:
                    break;
            }
        }
        catch (error) {
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
