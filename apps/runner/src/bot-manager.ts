import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  REST,
  Routes
} from "discord.js";
import IORedis from "ioredis";
import { RunnerApi } from "./api";
import {
  executeCommand,
  executeGenericEvent,
  executeMessageCreateEvent,
  executePrefixCommand,
  handlePersistentComponentInteraction,
  type EventPayload,
  type GenericEventRuntime
} from "./executor";
import { logger } from "./logging";

const optionTypeMap: Record<string, ApplicationCommandOptionType> = {
  string: ApplicationCommandOptionType.String,
  int: ApplicationCommandOptionType.Integer,
  bool: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
  channel: ApplicationCommandOptionType.Channel,
  role: ApplicationCommandOptionType.Role
};

type SupportedEventType =
  | "MESSAGE_CREATE"
  | "MESSAGE_DELETE"
  | "MESSAGE_UPDATE"
  | "CHANNEL_CREATE"
  | "CHANNEL_DELETE"
  | "CHANNEL_UPDATE"
  | "VOICE_CHANNEL_JOIN"
  | "VOICE_CHANNEL_LEAVE"
  | "VOICE_CHANNEL_MOVE"
  | "MEMBER_JOIN"
  | "MEMBER_LEAVE";

const SUPPORTED_EVENT_TYPES: SupportedEventType[] = [
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

interface EventCacheEntry {
  expiresAt: number;
  byType: Record<SupportedEventType, EventPayload[]>;
  inFlight?: Promise<Record<SupportedEventType, EventPayload[]>>;
}

function emptyEventMap(): Record<SupportedEventType, EventPayload[]> {
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

function buildRoleSnapshot(member?: GuildMember | null): string[] {
  if (!member) return [];
  const values: string[] = [];
  member.roles.cache.forEach((role) => {
    values.push(role.id);
    values.push(role.name);
  });
  const permissions = member.permissions.toArray();
  permissions.forEach((permission) => values.push(String(permission)));
  return values;
}

function asUser(user: any): { id: string; username: string; discriminator?: string } | undefined {
  if (!user?.id || !user?.username) return undefined;
  return {
    id: String(user.id),
    username: String(user.username),
    discriminator: user.discriminator ? String(user.discriminator) : undefined
  };
}

function asGuild(guild: any): { id: string; name?: string; iconUrl?: string } | undefined {
  if (!guild?.id) return undefined;
  return {
    id: String(guild.id),
    name: guild.name ? String(guild.name) : undefined,
    iconUrl: guild.iconURL?.() ?? undefined
  };
}

function asChannel(channel: any): { id: string; name?: string } | undefined {
  if (!channel?.id) return undefined;
  return {
    id: String(channel.id),
    name: channel.name ? String(channel.name) : undefined
  };
}

function textChannelId(channel: any): string | undefined {
  if (!channel?.id) return undefined;
  if (channel?.isTextBased?.()) return String(channel.id);
  return undefined;
}

function parsePrefixedInput(input: string): { commandName: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const tokens = trimmed.match(/"[^"]*"|'[^']*'|`[^`]*`|\S+/g) ?? [];
  if (tokens.length === 0) return null;
  const [rawCommandName, ...rawArgs] = tokens;
  if (!rawCommandName) return null;
  const normalize = (token: string) => {
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

function createCommandLookupCandidates(commandName: string): string[] {
  const trimmed = String(commandName ?? "").trim();
  if (!trimmed) return [];

  const withoutSlash = trimmed.replace(/^\/+/, "");
  const candidates = new Set<string>([
    trimmed,
    trimmed.toLowerCase(),
    withoutSlash,
    withoutSlash.toLowerCase()
  ]);

  return Array.from(candidates).filter(Boolean);
}

export class BotManager {
  private clients = new Map<string, Client>();
  private redis: IORedis;
  private eventCache = new Map<string, EventCacheEntry>();
  private eventCacheTtlMs = Number(process.env.RUNNER_EVENT_CACHE_TTL_MS ?? "10000");

  constructor(redis: IORedis) {
    this.redis = redis;
  }

  private async refreshEventCache(botId: string): Promise<Record<SupportedEventType, EventPayload[]>> {
    const grouped = emptyEventMap();
    const events = await RunnerApi.listEvents(botId);

    events.forEach((event) => {
      const eventType = String(event?.eventType ?? "") as SupportedEventType;
      if (!SUPPORTED_EVENT_TYPES.includes(eventType)) return;
      if (!event?.version?.compiledAstJson) return;
      grouped[eventType].push(event as EventPayload);
    });

    this.eventCache.set(botId, {
      expiresAt: Date.now() + this.eventCacheTtlMs,
      byType: grouped
    });
    return grouped;
  }

  private async getEventsForType(botId: string, eventType: SupportedEventType): Promise<EventPayload[]> {
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
    } finally {
      const latest = this.eventCache.get(botId);
      if (latest?.inFlight === inFlight) {
        latest.inFlight = undefined;
      }
    }
  }

  private clearEventCache(botId: string) {
    this.eventCache.delete(botId);
  }

  private async runGenericEvents(
    botId: string,
    client: Client,
    eventType: SupportedEventType,
    runtimeFactory: () => GenericEventRuntime
  ) {
    const events = await this.getEventsForType(botId, eventType);
    if (events.length === 0) return;

    for (const eventConfig of events) {
      try {
        await executeGenericEvent(botId, client, eventConfig, runtimeFactory());
      } catch (error: any) {
        logger.error(
          { botId, eventType, eventName: eventConfig.name, error: error?.message ?? error },
          "Failed to execute event workflow"
        );
      }
    }
  }

  async startBot(botId: string) {
    if (this.clients.has(botId)) {
      logger.warn({ botId }, "Bot already running");
      return;
    }
    this.clearEventCache(botId);

    const tokenInfo = await RunnerApi.getBotToken(botId);
    if (!tokenInfo?.token) throw new Error("Bot token missing");
    const prefix = (tokenInfo.prefix ?? "!").trim() || "!";

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
      ]
    });

    client.once(Events.ClientReady, () => {
      logger.info({ botId, user: client.user?.tag }, "Bot connected");
      RunnerApi.heartbeat(botId, "running").catch(() => undefined);
      RunnerApi.log(botId, "info", "Bot connected").catch(() => undefined);
    });

    client.on("interactionCreate", async (interaction) => {
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        (interaction.customId.startsWith("bg:") || interaction.customId.startsWith("bgsel:"))
      ) {
        await handlePersistentComponentInteraction(botId, client, interaction, this.redis);
        return;
      }

      if (!interaction.isChatInputCommand()) return;
      const command = await RunnerApi.getCommand(botId, interaction.commandName);
      if (!command?.version?.compiledAstJson) {
        await (interaction as ChatInputCommandInteraction).reply({
          content: "Command not published yet.",
          flags: 1 << 6
        });
        return;
      }
      await executeCommand(botId, client, interaction as ChatInputCommandInteraction, command, this.redis);
    });

    client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      if (!message.guildId) return;
      const content = String(message.content ?? "").trim();
      if (prefix && content.startsWith(prefix)) {
        const raw = content.slice(prefix.length).trim();
        if (!raw) return;

        const parsedInput = parsePrefixedInput(raw);
        if (!parsedInput?.commandName) return;

        try {
          let command: any = null;
          const lookupCandidates = createCommandLookupCandidates(parsedInput.commandName);
          for (const candidate of lookupCandidates) {
            command = await RunnerApi.getCommand(botId, candidate);
            if (command) break;
          }

          if (command?.type === "PREFIX" && command?.version?.compiledAstJson) {
            await executePrefixCommand(botId, client, message, command, this.redis, parsedInput.args);
          }
        } catch (error: any) {
          logger.error({ botId, error: error?.message ?? error }, "Failed to execute prefix command");
        }
        return;
      }

      try {
        const events = await this.getEventsForType(botId, "MESSAGE_CREATE");
        if (!Array.isArray(events) || events.length === 0) return;

        for (const eventConfig of events) {
          await executeMessageCreateEvent(botId, client, message, eventConfig);
        }
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute messageCreate events");
      }
    });

    client.on(Events.MessageDelete, async (message) => {
      if (!message.guildId) return;
      const author = (message as any).author;
      if (author?.bot) return;

      try {
        await this.runGenericEvents(botId, client, "MESSAGE_DELETE", () => ({
          user: asUser(author),
          guild: asGuild((message as any).guild),
          channel: asChannel((message as any).channel),
          memberRoles: buildRoleSnapshot((message as any).member ?? null),
          options: {
            messageId: message.id,
            messageContent: (message as any).content ?? "",
            channelId: message.channelId,
            guildId: message.guildId,
            userId: author?.id ?? null
          },
          defaultChannelId: message.channelId,
          defaultUserId: author?.id
        }));
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute messageDelete events");
      }
    });

    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (!newMessage.guildId) return;
      const author = (newMessage as any).author ?? (oldMessage as any).author;
      if (author?.bot) return;

      try {
        await this.runGenericEvents(botId, client, "MESSAGE_UPDATE", () => ({
          user: asUser(author),
          guild: asGuild((newMessage as any).guild ?? (oldMessage as any).guild),
          channel: asChannel((newMessage as any).channel ?? (oldMessage as any).channel),
          memberRoles: buildRoleSnapshot((newMessage as any).member ?? (oldMessage as any).member ?? null),
          options: {
            messageId: newMessage.id ?? oldMessage.id,
            oldContent: (oldMessage as any).content ?? "",
            newContent: (newMessage as any).content ?? "",
            channelId: newMessage.channelId ?? oldMessage.channelId,
            guildId: newMessage.guildId ?? oldMessage.guildId,
            userId: author?.id ?? null
          },
          defaultChannelId: newMessage.channelId ?? oldMessage.channelId,
          defaultUserId: author?.id
        }));
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute messageUpdate events");
      }
    });

    client.on(Events.ChannelCreate, async (channel) => {
      try {
        await this.runGenericEvents(botId, client, "CHANNEL_CREATE", () => ({
          guild: asGuild((channel as any).guild),
          channel: asChannel(channel),
          memberRoles: [],
          options: {
            channelId: channel.id,
            channelName: (channel as any).name ?? "",
            channelType: String((channel as any).type ?? "")
          },
          defaultChannelId: textChannelId(channel) ?? (channel as any).guild?.systemChannelId
        }));
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute channelCreate events");
      }
    });

    client.on(Events.ChannelDelete, async (channel) => {
      try {
        await this.runGenericEvents(botId, client, "CHANNEL_DELETE", () => ({
          guild: asGuild((channel as any).guild),
          channel: asChannel(channel),
          memberRoles: [],
          options: {
            channelId: channel.id,
            channelName: (channel as any).name ?? "",
            channelType: String((channel as any).type ?? "")
          },
          defaultChannelId: (channel as any).guild?.systemChannelId
        }));
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute channelDelete events");
      }
    });

    client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
      try {
        await this.runGenericEvents(botId, client, "CHANNEL_UPDATE", () => ({
          guild: asGuild((newChannel as any).guild ?? (oldChannel as any).guild),
          channel: asChannel(newChannel),
          memberRoles: [],
          options: {
            channelId: newChannel.id ?? oldChannel.id,
            oldName: (oldChannel as any).name ?? "",
            newName: (newChannel as any).name ?? "",
            oldType: String((oldChannel as any).type ?? ""),
            newType: String((newChannel as any).type ?? "")
          },
          defaultChannelId: textChannelId(newChannel) ?? (newChannel as any).guild?.systemChannelId
        }));
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute channelUpdate events");
      }
    });

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
      const member = newState.member ?? oldState.member;
      if (!member || member.user.bot) return;

      const oldChannelId = oldState.channelId ?? null;
      const newChannelId = newState.channelId ?? null;
      let eventType: SupportedEventType | null = null;
      if (!oldChannelId && newChannelId) eventType = "VOICE_CHANNEL_JOIN";
      if (oldChannelId && !newChannelId) eventType = "VOICE_CHANNEL_LEAVE";
      if (oldChannelId && newChannelId && oldChannelId !== newChannelId) eventType = "VOICE_CHANNEL_MOVE";
      if (!eventType) return;

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
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute voice state events");
      }
    });

    client.on(Events.GuildMemberAdd, async (member) => {
      if (member.user.bot) return;
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
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute memberJoin events");
      }
    });

    client.on(Events.GuildMemberRemove, async (member) => {
      if (member.user.bot) return;
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
      } catch (error: any) {
        logger.error({ botId, error: error?.message ?? error }, "Failed to execute memberLeave events");
      }
    });

    try {
      await client.login(tokenInfo.token);
      this.clients.set(botId, client);
    } catch (error: any) {
      logger.error({ botId, error }, "Bot login failed");
      await RunnerApi.heartbeat(botId, "error", error?.message ?? "Login failed");
      throw error;
    }
  }

  async stopBot(botId: string) {
    const client = this.clients.get(botId);
    if (!client) return;
    await client.destroy();
    this.clients.delete(botId);
    this.clearEventCache(botId);
    await RunnerApi.log(botId, "info", "Bot stopped").catch(() => undefined);
    await RunnerApi.heartbeat(botId, "stopped").catch(() => undefined);
  }

  async syncCommands(botId: string) {
    const tokenInfo = await RunnerApi.getBotToken(botId);
    if (!tokenInfo?.token || !tokenInfo.applicationId) return;
    const commands = await RunnerApi.listCommands(botId);
    const payload = commands
      .filter((cmd) => cmd.type === "SLASH")
      .map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        options: (cmd.options ?? []).map((opt: any) => ({
          name: opt.name,
          description: opt.description ?? opt.name,
          type: optionTypeMap[opt.type] ?? ApplicationCommandOptionType.String,
          required: opt.required ?? false
        }))
      }));

    const rest = new REST({ version: "10" }).setToken(tokenInfo.token);

    if (tokenInfo.testGuildId) {
      await rest.put(Routes.applicationGuildCommands(tokenInfo.applicationId, tokenInfo.testGuildId), { body: payload });
      logger.info({ botId }, "Synced commands to test guild");
    } else {
      await rest.put(Routes.applicationCommands(tokenInfo.applicationId), { body: payload });
      logger.warn({ botId }, "Synced commands globally (may take up to 1 hour)");
    }
  }

  async heartbeatAll() {
    const promises: Promise<any>[] = [];
    for (const botId of this.clients.keys()) {
      promises.push(RunnerApi.heartbeat(botId, "running"));
    }
    await Promise.allSettled(promises);
  }
}
