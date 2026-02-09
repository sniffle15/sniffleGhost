"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotManager = void 0;
const discord_js_1 = require("discord.js");
const api_1 = require("./api");
const executor_1 = require("./executor");
const logging_1 = require("./logging");
const optionTypeMap = {
    string: discord_js_1.ApplicationCommandOptionType.String,
    int: discord_js_1.ApplicationCommandOptionType.Integer,
    bool: discord_js_1.ApplicationCommandOptionType.Boolean,
    user: discord_js_1.ApplicationCommandOptionType.User,
    channel: discord_js_1.ApplicationCommandOptionType.Channel,
    role: discord_js_1.ApplicationCommandOptionType.Role
};
const SUPPORTED_EVENT_TYPES = [
    "MESSAGE_CREATE",
    "MESSAGE_DELETE",
    "MESSAGE_UPDATE",
    "CHANNEL_CREATE",
    "CHANNEL_DELETE",
    "CHANNEL_UPDATE",
    "VOICE_CHANNEL_JOIN",
    "VOICE_CHANNEL_LEAVE",
    "VOICE_CHANNEL_MOVE",
    "MEMBER_JOIN",
    "MEMBER_LEAVE"
];
function emptyEventMap() {
    return {
        MESSAGE_CREATE: [],
        MESSAGE_DELETE: [],
        MESSAGE_UPDATE: [],
        CHANNEL_CREATE: [],
        CHANNEL_DELETE: [],
        CHANNEL_UPDATE: [],
        VOICE_CHANNEL_JOIN: [],
        VOICE_CHANNEL_LEAVE: [],
        VOICE_CHANNEL_MOVE: [],
        MEMBER_JOIN: [],
        MEMBER_LEAVE: []
    };
}
function buildRoleSnapshot(member) {
    if (!member)
        return [];
    const values = [];
    member.roles.cache.forEach((role) => {
        values.push(role.id);
        values.push(role.name);
    });
    const permissions = member.permissions.toArray();
    permissions.forEach((permission) => values.push(String(permission)));
    return values;
}
function asUser(user) {
    if (!user?.id || !user?.username)
        return undefined;
    return {
        id: String(user.id),
        username: String(user.username),
        discriminator: user.discriminator ? String(user.discriminator) : undefined
    };
}
function asGuild(guild) {
    if (!guild?.id)
        return undefined;
    return {
        id: String(guild.id),
        name: guild.name ? String(guild.name) : undefined,
        iconUrl: guild.iconURL?.() ?? undefined
    };
}
function asChannel(channel) {
    if (!channel?.id)
        return undefined;
    return {
        id: String(channel.id),
        name: channel.name ? String(channel.name) : undefined
    };
}
function textChannelId(channel) {
    if (!channel?.id)
        return undefined;
    if (channel?.isTextBased?.())
        return String(channel.id);
    return undefined;
}
function parsePrefixedInput(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    const tokens = trimmed.match(/"[^"]*"|'[^']*'|`[^`]*`|\S+/g) ?? [];
    if (tokens.length === 0)
        return null;
    const [rawCommandName, ...rawArgs] = tokens;
    if (!rawCommandName)
        return null;
    const normalize = (token) => {
        const first = token[0];
        const last = token[token.length - 1];
        if ((first === "\"" && last === "\"") || (first === "'" && last === "'") || (first === "`" && last === "`")) {
            return token.slice(1, -1);
        }
        return token;
    };
    return {
        commandName: normalize(rawCommandName),
        args: rawArgs.map(normalize)
    };
}
function createCommandLookupCandidates(commandName) {
    const trimmed = String(commandName ?? "").trim();
    if (!trimmed)
        return [];
    const withoutSlash = trimmed.replace(/^\/+/, "");
    const candidates = new Set([
        trimmed,
        trimmed.toLowerCase(),
        withoutSlash,
        withoutSlash.toLowerCase()
    ]);
    return Array.from(candidates).filter(Boolean);
}
class BotManager {
    constructor(redis) {
        this.clients = new Map();
        this.eventCache = new Map();
        this.eventCacheTtlMs = Number(process.env.RUNNER_EVENT_CACHE_TTL_MS ?? "10000");
        this.redis = redis;
    }
    async refreshEventCache(botId) {
        const grouped = emptyEventMap();
        const events = await api_1.RunnerApi.listEvents(botId);
        events.forEach((event) => {
            const eventType = String(event?.eventType ?? "");
            if (!SUPPORTED_EVENT_TYPES.includes(eventType))
                return;
            if (!event?.version?.compiledAstJson)
                return;
            grouped[eventType].push(event);
        });
        this.eventCache.set(botId, {
            expiresAt: Date.now() + this.eventCacheTtlMs,
            byType: grouped
        });
        return grouped;
    }
    async getEventsForType(botId, eventType) {
        const cached = this.eventCache.get(botId);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
            return cached.byType[eventType] ?? [];
        }
        if (cached?.inFlight) {
            const map = await cached.inFlight;
            return map[eventType] ?? [];
        }
        const inFlight = this.refreshEventCache(botId);
        this.eventCache.set(botId, {
            expiresAt: 0,
            byType: cached?.byType ?? emptyEventMap(),
            inFlight
        });
        try {
            const map = await inFlight;
            return map[eventType] ?? [];
        }
        finally {
            const latest = this.eventCache.get(botId);
            if (latest?.inFlight === inFlight) {
                latest.inFlight = undefined;
            }
        }
    }
    clearEventCache(botId) {
        this.eventCache.delete(botId);
    }
    async runGenericEvents(botId, client, eventType, runtimeFactory) {
        const events = await this.getEventsForType(botId, eventType);
        if (events.length === 0)
            return;
        for (const eventConfig of events) {
            try {
                await (0, executor_1.executeGenericEvent)(botId, client, eventConfig, runtimeFactory());
            }
            catch (error) {
                logging_1.logger.error({ botId, eventType, eventName: eventConfig.name, error: error?.message ?? error }, "Failed to execute event workflow");
            }
        }
    }
    async startBot(botId) {
        if (this.clients.has(botId)) {
            logging_1.logger.warn({ botId }, "Bot already running");
            return;
        }
        this.clearEventCache(botId);
        const tokenInfo = await api_1.RunnerApi.getBotToken(botId);
        if (!tokenInfo?.token)
            throw new Error("Bot token missing");
        const prefix = (tokenInfo.prefix ?? "!").trim() || "!";
        const client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.GuildMembers,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
                discord_js_1.GatewayIntentBits.DirectMessages
            ]
        });
        client.once(discord_js_1.Events.ClientReady, () => {
            logging_1.logger.info({ botId, user: client.user?.tag }, "Bot connected");
            api_1.RunnerApi.heartbeat(botId, "running").catch(() => undefined);
            api_1.RunnerApi.log(botId, "info", "Bot connected").catch(() => undefined);
        });
        client.on("interactionCreate", async (interaction) => {
            if ((interaction.isButton() || interaction.isStringSelectMenu()) &&
                (interaction.customId.startsWith("bg:") || interaction.customId.startsWith("bgsel:"))) {
                await (0, executor_1.handlePersistentComponentInteraction)(botId, client, interaction, this.redis);
                return;
            }
            if (!interaction.isChatInputCommand())
                return;
            const command = await api_1.RunnerApi.getCommand(botId, interaction.commandName);
            if (!command?.version?.compiledAstJson) {
                await interaction.reply({
                    content: "Command not published yet.",
                    flags: 1 << 6
                });
                return;
            }
            await (0, executor_1.executeCommand)(botId, client, interaction, command, this.redis);
        });
        client.on(discord_js_1.Events.MessageCreate, async (message) => {
            if (message.author.bot)
                return;
            if (!message.guildId)
                return;
            const content = String(message.content ?? "").trim();
            if (prefix && content.startsWith(prefix)) {
                const raw = content.slice(prefix.length).trim();
                if (!raw)
                    return;
                const parsedInput = parsePrefixedInput(raw);
                if (!parsedInput?.commandName)
                    return;
                try {
                    let command = null;
                    const lookupCandidates = createCommandLookupCandidates(parsedInput.commandName);
                    for (const candidate of lookupCandidates) {
                        command = await api_1.RunnerApi.getCommand(botId, candidate);
                        if (command)
                            break;
                    }
                    if (command?.type === "PREFIX" && command?.version?.compiledAstJson) {
                        await (0, executor_1.executePrefixCommand)(botId, client, message, command, this.redis, parsedInput.args);
                    }
                }
                catch (error) {
                    logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute prefix command");
                }
                return;
            }
            try {
                const events = await this.getEventsForType(botId, "MESSAGE_CREATE");
                if (!Array.isArray(events) || events.length === 0)
                    return;
                for (const eventConfig of events) {
                    await (0, executor_1.executeMessageCreateEvent)(botId, client, message, eventConfig);
                }
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute messageCreate events");
            }
        });
        client.on(discord_js_1.Events.MessageDelete, async (message) => {
            if (!message.guildId)
                return;
            const author = message.author;
            if (author?.bot)
                return;
            try {
                await this.runGenericEvents(botId, client, "MESSAGE_DELETE", () => ({
                    user: asUser(author),
                    guild: asGuild(message.guild),
                    channel: asChannel(message.channel),
                    memberRoles: buildRoleSnapshot(message.member ?? null),
                    options: {
                        messageId: message.id,
                        messageContent: message.content ?? "",
                        channelId: message.channelId,
                        guildId: message.guildId,
                        userId: author?.id ?? null
                    },
                    defaultChannelId: message.channelId,
                    defaultUserId: author?.id
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute messageDelete events");
            }
        });
        client.on(discord_js_1.Events.MessageUpdate, async (oldMessage, newMessage) => {
            if (!newMessage.guildId)
                return;
            const author = newMessage.author ?? oldMessage.author;
            if (author?.bot)
                return;
            try {
                await this.runGenericEvents(botId, client, "MESSAGE_UPDATE", () => ({
                    user: asUser(author),
                    guild: asGuild(newMessage.guild ?? oldMessage.guild),
                    channel: asChannel(newMessage.channel ?? oldMessage.channel),
                    memberRoles: buildRoleSnapshot(newMessage.member ?? oldMessage.member ?? null),
                    options: {
                        messageId: newMessage.id ?? oldMessage.id,
                        oldContent: oldMessage.content ?? "",
                        newContent: newMessage.content ?? "",
                        channelId: newMessage.channelId ?? oldMessage.channelId,
                        guildId: newMessage.guildId ?? oldMessage.guildId,
                        userId: author?.id ?? null
                    },
                    defaultChannelId: newMessage.channelId ?? oldMessage.channelId,
                    defaultUserId: author?.id
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute messageUpdate events");
            }
        });
        client.on(discord_js_1.Events.ChannelCreate, async (channel) => {
            try {
                await this.runGenericEvents(botId, client, "CHANNEL_CREATE", () => ({
                    guild: asGuild(channel.guild),
                    channel: asChannel(channel),
                    memberRoles: [],
                    options: {
                        channelId: channel.id,
                        channelName: channel.name ?? "",
                        channelType: String(channel.type ?? "")
                    },
                    defaultChannelId: textChannelId(channel) ?? channel.guild?.systemChannelId
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute channelCreate events");
            }
        });
        client.on(discord_js_1.Events.ChannelDelete, async (channel) => {
            try {
                await this.runGenericEvents(botId, client, "CHANNEL_DELETE", () => ({
                    guild: asGuild(channel.guild),
                    channel: asChannel(channel),
                    memberRoles: [],
                    options: {
                        channelId: channel.id,
                        channelName: channel.name ?? "",
                        channelType: String(channel.type ?? "")
                    },
                    defaultChannelId: channel.guild?.systemChannelId
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute channelDelete events");
            }
        });
        client.on(discord_js_1.Events.ChannelUpdate, async (oldChannel, newChannel) => {
            try {
                await this.runGenericEvents(botId, client, "CHANNEL_UPDATE", () => ({
                    guild: asGuild(newChannel.guild ?? oldChannel.guild),
                    channel: asChannel(newChannel),
                    memberRoles: [],
                    options: {
                        channelId: newChannel.id ?? oldChannel.id,
                        oldName: oldChannel.name ?? "",
                        newName: newChannel.name ?? "",
                        oldType: String(oldChannel.type ?? ""),
                        newType: String(newChannel.type ?? "")
                    },
                    defaultChannelId: textChannelId(newChannel) ?? newChannel.guild?.systemChannelId
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute channelUpdate events");
            }
        });
        client.on(discord_js_1.Events.VoiceStateUpdate, async (oldState, newState) => {
            const member = newState.member ?? oldState.member;
            if (!member || member.user.bot)
                return;
            const oldChannelId = oldState.channelId ?? null;
            const newChannelId = newState.channelId ?? null;
            let eventType = null;
            if (!oldChannelId && newChannelId)
                eventType = "VOICE_CHANNEL_JOIN";
            if (oldChannelId && !newChannelId)
                eventType = "VOICE_CHANNEL_LEAVE";
            if (oldChannelId && newChannelId && oldChannelId !== newChannelId)
                eventType = "VOICE_CHANNEL_MOVE";
            if (!eventType)
                return;
            const guild = newState.guild ?? oldState.guild;
            const fallbackChannelId = guild?.systemChannelId ?? undefined;
            try {
                await this.runGenericEvents(botId, client, eventType, () => ({
                    user: asUser(member.user),
                    guild: asGuild(guild),
                    channel: asChannel(newState.channel ?? oldState.channel),
                    memberRoles: buildRoleSnapshot(member),
                    options: {
                        userId: member.user.id,
                        oldChannelId,
                        newChannelId,
                        oldChannelName: oldState.channel?.name ?? null,
                        newChannelName: newState.channel?.name ?? null
                    },
                    defaultChannelId: fallbackChannelId,
                    defaultUserId: member.user.id
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute voice state events");
            }
        });
        client.on(discord_js_1.Events.GuildMemberAdd, async (member) => {
            if (member.user.bot)
                return;
            try {
                await this.runGenericEvents(botId, client, "MEMBER_JOIN", () => ({
                    user: asUser(member.user),
                    guild: asGuild(member.guild),
                    memberRoles: buildRoleSnapshot(member),
                    options: {
                        userId: member.user.id,
                        username: member.user.username,
                        displayName: member.displayName,
                        joinedAt: member.joinedAt?.toISOString?.() ?? null
                    },
                    defaultChannelId: member.guild.systemChannelId ?? undefined,
                    defaultUserId: member.user.id
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute memberJoin events");
            }
        });
        client.on(discord_js_1.Events.GuildMemberRemove, async (member) => {
            if (member.user.bot)
                return;
            try {
                await this.runGenericEvents(botId, client, "MEMBER_LEAVE", () => ({
                    user: asUser(member.user),
                    guild: asGuild(member.guild),
                    memberRoles: [],
                    options: {
                        userId: member.user.id,
                        username: member.user.username,
                        displayName: member.displayName
                    },
                    defaultChannelId: member.guild.systemChannelId ?? undefined,
                    defaultUserId: member.user.id
                }));
            }
            catch (error) {
                logging_1.logger.error({ botId, error: error?.message ?? error }, "Failed to execute memberLeave events");
            }
        });
        try {
            await client.login(tokenInfo.token);
            this.clients.set(botId, client);
        }
        catch (error) {
            logging_1.logger.error({ botId, error }, "Bot login failed");
            await api_1.RunnerApi.heartbeat(botId, "error", error?.message ?? "Login failed");
            throw error;
        }
    }
    async stopBot(botId) {
        const client = this.clients.get(botId);
        if (!client)
            return;
        await client.destroy();
        this.clients.delete(botId);
        this.clearEventCache(botId);
        await api_1.RunnerApi.log(botId, "info", "Bot stopped").catch(() => undefined);
        await api_1.RunnerApi.heartbeat(botId, "stopped").catch(() => undefined);
    }
    async syncCommands(botId) {
        const tokenInfo = await api_1.RunnerApi.getBotToken(botId);
        if (!tokenInfo?.token || !tokenInfo.applicationId)
            return;
        const commands = await api_1.RunnerApi.listCommands(botId);
        const payload = commands
            .filter((cmd) => cmd.type === "SLASH")
            .map((cmd) => ({
            name: cmd.name,
            description: cmd.description,
            options: (cmd.options ?? []).map((opt) => ({
                name: opt.name,
                description: opt.description ?? opt.name,
                type: optionTypeMap[opt.type] ?? discord_js_1.ApplicationCommandOptionType.String,
                required: opt.required ?? false
            }))
        }));
        const rest = new discord_js_1.REST({ version: "10" }).setToken(tokenInfo.token);
        if (tokenInfo.testGuildId) {
            await rest.put(discord_js_1.Routes.applicationGuildCommands(tokenInfo.applicationId, tokenInfo.testGuildId), { body: payload });
            logging_1.logger.info({ botId }, "Synced commands to test guild");
        }
        else {
            await rest.put(discord_js_1.Routes.applicationCommands(tokenInfo.applicationId), { body: payload });
            logging_1.logger.warn({ botId }, "Synced commands globally (may take up to 1 hour)");
        }
    }
    async heartbeatAll() {
        const promises = [];
        for (const botId of this.clients.keys()) {
            promises.push(api_1.RunnerApi.heartbeat(botId, "running"));
        }
        await Promise.allSettled(promises);
    }
}
exports.BotManager = BotManager;
