export type NodeType = "SlashCommandTrigger" | "ReplyMessage" | "SendChannelMessage" | "SendDM" | "EmbedMessage" | "IfElse" | "SwitchCase" | "Loop" | "SetVariable" | "GetPersistentVariable" | "SetPersistentVariable" | "Delay" | "HttpRequest" | "AddRole" | "RemoveRole" | "Logger" | "Stop";
export type VariableScope = "local" | "user" | "guild";
export interface WorkflowPosition {
    x: number;
    y: number;
}
export interface BaseNodeData {
    name?: string;
    disabled?: boolean;
}
export interface SlashCommandTriggerData extends BaseNodeData {
    commandName: string;
    description?: string;
}
export interface ReplyMessageData extends BaseNodeData {
    template: string;
    ephemeral?: boolean;
    buttons?: MessageButton[];
    selectMenus?: MessageSelectMenu[];
}
export interface SendChannelMessageData extends BaseNodeData {
    channelId: string;
    template: string;
    buttons?: MessageButton[];
    selectMenus?: MessageSelectMenu[];
}
export interface SendDMData extends BaseNodeData {
    template: string;
    buttons?: MessageButton[];
    selectMenus?: MessageSelectMenu[];
}
export interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
}
export type ButtonStyle = "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER" | "LINK";
export interface MessageButton {
    id: string;
    label: string;
    style: ButtonStyle;
    url?: string;
    disabled?: boolean;
}
export interface MessageSelectOption {
    id: string;
    label: string;
    value: string;
    description?: string;
    emoji?: string;
    default?: boolean;
}
export interface MessageSelectMenu {
    id: string;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    options: MessageSelectOption[];
}
export interface EmbedMessageData extends BaseNodeData {
    channelId?: string;
    title?: string;
    description?: string;
    url?: string;
    color?: string;
    fields?: EmbedField[];
    footer?: string;
    footerIconUrl?: string;
    authorName?: string;
    authorUrl?: string;
    authorIconUrl?: string;
    timestamp?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    buttons?: MessageButton[];
    selectMenus?: MessageSelectMenu[];
}
export type ConditionOperator = "equals" | "notEquals" | "contains" | "startsWith" | "endsWith" | "gt" | "lt" | "in" | "hasRole" | "hasPermission";
export interface ConditionRule {
    left: string;
    operator: ConditionOperator;
    right?: string;
}
export interface ConditionGroup {
    op: "AND" | "OR";
    rules: Array<ConditionRule | ConditionGroup>;
}
export interface IfElseData extends BaseNodeData {
    conditions: ConditionGroup;
}
export interface SwitchCaseData extends BaseNodeData {
    expression: string;
    cases: Array<{
        value: string;
        label?: string;
    }>;
    defaultEnabled?: boolean;
}
export interface LoopData extends BaseNodeData {
    listExpression: string;
    itemVar: string;
    maxIterations?: number;
}
export interface SetVariableData extends BaseNodeData {
    name: string;
    value: string;
}
export interface GetPersistentVariableData extends BaseNodeData {
    key: string;
    scope: Exclude<VariableScope, "local">;
    assignTo: string;
    defaultValue?: string;
}
export interface SetPersistentVariableData extends BaseNodeData {
    key: string;
    scope: Exclude<VariableScope, "local">;
    value: string;
}
export interface DelayData extends BaseNodeData {
    ms: number;
}
export interface HttpRequestData extends BaseNodeData {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    retries?: number;
    responseVar?: string;
}
export interface AddRoleData extends BaseNodeData {
    roleId: string;
    reason?: string;
}
export interface RemoveRoleData extends BaseNodeData {
    roleId: string;
    reason?: string;
}
export interface LoggerData extends BaseNodeData {
    level: "info" | "warn" | "error";
    message: string;
}
export interface StopData extends BaseNodeData {
}
export type NodeData = SlashCommandTriggerData | ReplyMessageData | SendChannelMessageData | SendDMData | EmbedMessageData | IfElseData | SwitchCaseData | LoopData | SetVariableData | GetPersistentVariableData | SetPersistentVariableData | DelayData | HttpRequestData | AddRoleData | RemoveRoleData | LoggerData | StopData;
export interface WorkflowNode<TData extends NodeData = NodeData> {
    id: string;
    type: NodeType;
    position: WorkflowPosition;
    data: TData;
}
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}
export interface WorkflowGraph {
    version: number;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}
export interface ExecutableWorkflow {
    version: number;
    startNodeId: string;
    nodes: Record<string, WorkflowNode>;
    edges: Record<string, Record<string, string>>;
    loopContinuations?: Record<string, string>;
}
export interface ExecutionContext {
    botId: string;
    commandName: string;
    user: {
        id: string;
        username: string;
        discriminator?: string;
    };
    guild?: {
        id: string;
        name?: string;
        iconUrl?: string;
    };
    channel?: {
        id: string;
        name?: string;
    };
    options: Record<string, unknown>;
    memberRoles: string[];
    variables: Record<string, unknown>;
}
export interface ExecutionEvent {
    ts: number;
    type: "node:enter" | "node:exit" | "log" | "error" | "action";
    nodeId?: string;
    message?: string;
    data?: Record<string, unknown>;
}
export interface ExecutionResult {
    events: ExecutionEvent[];
    stopped: boolean;
    error?: string;
}
export interface ExecutionLimits {
    maxNodes: number;
    maxDurationMs: number;
    maxLoopIterations: number;
}
export interface VariableStore {
    get(scope: Exclude<VariableScope, "local">, key: string): Promise<unknown>;
    set(scope: Exclude<VariableScope, "local">, key: string, value: unknown): Promise<void>;
}
export interface ActionHandlers {
    reply: (content: string, options?: {
        ephemeral?: boolean;
        buttons?: MessageButton[];
        selectMenus?: MessageSelectMenu[];
    }) => Promise<any>;
    sendChannel: (channelId: string, content: string, options?: {
        buttons?: MessageButton[];
        selectMenus?: MessageSelectMenu[];
    }) => Promise<any>;
    sendDm: (content: string, options?: {
        buttons?: MessageButton[];
        selectMenus?: MessageSelectMenu[];
    }) => Promise<any>;
    sendEmbed: (embed: EmbedMessageData, options?: {
        buttons?: MessageButton[];
        selectMenus?: MessageSelectMenu[];
    }) => Promise<any>;
    registerInteraction?: (input: {
        message: any;
        nodeId: string;
        routes: Record<string, string>;
        buttons: MessageButton[];
        selectMenus: MessageSelectMenu[];
        context: ExecutionContext;
    }) => Promise<void>;
    awaitInteraction?: (input: {
        message: any;
        buttons: MessageButton[];
        selectMenus: MessageSelectMenu[];
        userId: string;
        timeoutMs?: number;
    }) => Promise<{
        kind: "button";
        buttonId: string;
    } | {
        kind: "select";
        menuId: string;
        optionValue?: string;
    } | null>;
    addRole: (roleId: string, reason?: string) => Promise<void>;
    removeRole: (roleId: string, reason?: string) => Promise<void>;
    log: (level: LoggerData["level"], message: string, meta?: Record<string, unknown>) => Promise<void>;
    httpRequest: (data: HttpRequestData) => Promise<{
        status: number;
        body: unknown;
    }>;
}
