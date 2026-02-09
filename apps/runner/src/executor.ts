import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Message,
  MessageComponentInteraction,
  StringSelectMenuBuilder
} from "discord.js";
import {
  executeWorkflow,
  type ActionHandlers,
  type ExecutableWorkflow,
  type ExecutionContext,
  type HttpRequestData
} from "@botghost/shared";
import { RunnerApi } from "./api";
import { logger } from "./logging";
import IORedis from "ioredis";

interface CommandPayload {
  commandId?: string;
  id?: string;
  name: string;
  description: string;
  type: string;
  options?: Array<{ name: string; description?: string; type: string; required?: boolean }>;
  permissions?: { adminOnly?: boolean; roleAllowlist?: string[]; channelAllowlist?: string[] };
  cooldownSeconds?: number;
  version: { compiledAstJson: ExecutableWorkflow };
}

export interface EventPayload {
  id: string;
  name: string;
  description: string;
  type: string;
  eventType?: string;
  version: { compiledAstJson: ExecutableWorkflow };
}

export interface GenericEventRuntime {
  user?: { id: string; username: string; discriminator?: string };
  guild?: { id: string; name?: string; iconUrl?: string };
  channel?: { id: string; name?: string };
  memberRoles?: string[];
  options?: Record<string, unknown>;
  defaultChannelId?: string;
  defaultUserId?: string;
}

type WorkflowInteraction = ChatInputCommandInteraction | MessageComponentInteraction;

interface PersistentInteractionSession {
  botId: string;
  commandName: string;
  executable: ExecutableWorkflow;
  routes: Record<string, string>;
  context: ExecutionContext;
  selectValueToOptionId: Record<string, Record<string, string>>;
  expiresAt: number;
}

const interactionSessions = new Map<string, PersistentInteractionSession>();
const INTERACTION_SESSION_TTL_MS = Number(process.env.INTERACTION_SESSION_TTL_MS ?? "86400000");

function cloneContext(context: ExecutionContext): ExecutionContext {
  return JSON.parse(JSON.stringify(context)) as ExecutionContext;
}

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [messageId, session] of interactionSessions.entries()) {
    if (session.expiresAt <= now) {
      interactionSessions.delete(messageId);
    }
  }
}

function buildOptions(interaction: ChatInputCommandInteraction) {
  const options: Record<string, unknown> = {};
  for (const opt of interaction.options.data) {
    options[opt.name] = opt.value ?? opt.options?.map((sub) => sub.value) ?? null;
  }
  return options;
}

function coercePrefixArg(rawValue: string, type: string): unknown {
  switch (String(type ?? "string").toLowerCase()) {
    case "int": {
      const value = Number(rawValue);
      return Number.isFinite(value) ? value : null;
    }
    case "bool": {
      const normalized = rawValue.trim().toLowerCase();
      if (["true", "1", "yes", "on", "y"].includes(normalized)) return true;
      if (["false", "0", "no", "off", "n"].includes(normalized)) return false;
      return null;
    }
    default:
      return rawValue;
  }
}

function parsePrefixOptions(command: CommandPayload, args: string[]) {
  const optionDefs = Array.isArray(command.options) ? command.options : [];
  const parsed: Record<string, unknown> = {};

  optionDefs.forEach((option, index) => {
    const raw = args[index];
    if (raw === undefined) {
      parsed[option.name] = null;
      return;
    }
    parsed[option.name] = coercePrefixArg(raw, option.type);
  });

  parsed.__args = args;
  parsed.__raw = args.join(" ");
  return parsed;
}

function buttonStyleToDiscord(style?: string): ButtonStyle {
  switch (String(style ?? "SECONDARY").toUpperCase()) {
    case "PRIMARY":
      return ButtonStyle.Primary;
    case "SUCCESS":
      return ButtonStyle.Success;
    case "DANGER":
      return ButtonStyle.Danger;
    case "LINK":
      return ButtonStyle.Link;
    case "SECONDARY":
    default:
      return ButtonStyle.Secondary;
  }
}

function buildButtonRows(botId: string, buttons: any[] = []) {
  const rows: Array<ActionRowBuilder<any>> = [];
  let current = new ActionRowBuilder<any>();

  const sanitized = buttons.filter((btn) => btn?.label);
  sanitized.forEach((btn, index) => {
    const style = buttonStyleToDiscord(btn.style);
    const builder = new ButtonBuilder()
      .setLabel(String(btn.label))
      .setStyle(style)
      .setDisabled(Boolean(btn.disabled));

    if (style === ButtonStyle.Link) {
      const url = normalizeUrl(btn.url);
      if (!url) return;
      builder.setURL(url);
    } else {
      const customId = `bg:${botId}:${btn.id ?? index}`;
      builder.setCustomId(customId);
    }

    if ((current.components?.length ?? 0) >= 5) {
      rows.push(current);
      current = new ActionRowBuilder<any>();
    }
    current.addComponents(builder);
  });

  if (current.components?.length) {
    rows.push(current);
  }
  return rows;
}

function normalizeBounds(min: number | undefined, max: number | undefined, optionCount: number) {
  const safeMin = Math.max(0, Math.min(min ?? 1, optionCount));
  const safeMax = Math.max(safeMin || 1, Math.min(max ?? 1, optionCount));
  return { min: safeMin || 1, max: safeMax };
}

function buildSelectMenuRows(botId: string, selectMenus: any[] = []) {
  const rows: Array<ActionRowBuilder<any>> = [];
  const menus = selectMenus.filter(
    (menu) => menu?.id && Array.isArray(menu.options) && menu.options.some((option: any) => option?.label && option?.value)
  );

  menus.forEach((menu) => {
    const options = (menu.options as any[])
      .filter((option) => option?.label && option?.value)
      .slice(0, 25)
      .map((option) => ({
        label: String(option.label).slice(0, 100),
        value: String(option.value).slice(0, 100),
        description: option.description ? String(option.description).slice(0, 100) : undefined,
        default: Boolean(option.default)
      }));

    if (options.length === 0) return;
    const bounds = normalizeBounds(menu.minValues, menu.maxValues, options.length);
    const builder = new StringSelectMenuBuilder()
      .setCustomId(`bgsel:${botId}:${menu.id}`)
      .setMinValues(bounds.min)
      .setMaxValues(bounds.max)
      .setDisabled(Boolean(menu.disabled))
      .addOptions(options);

    if (menu.placeholder) {
      builder.setPlaceholder(String(menu.placeholder).slice(0, 150));
    }

    rows.push(new ActionRowBuilder<any>().addComponents(builder));
  });

  return rows;
}

function buildMessageComponents(botId: string, input: { buttons?: any[]; selectMenus?: any[] } = {}) {
  const buttonRows = buildButtonRows(botId, input.buttons ?? []);
  const selectRows = buildSelectMenuRows(botId, input.selectMenus ?? []);
  return [...buttonRows, ...selectRows].slice(0, 5);
}

function normalizeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return undefined;
  }
}

async function safeReply(
  interaction: WorkflowInteraction,
  content: string,
  ephemeral?: boolean,
  components?: Array<ActionRowBuilder<any>>
) {
  const flags = ephemeral ? 1 << 6 : undefined;
  const payload = {
    ...(flags ? { flags } : {}),
    ...(components && components.length ? { components } : {})
  };
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content, ...payload });
  }
  await interaction.reply({ content, ...payload });
  return interaction.fetchReply();
}

function buildRoleList(member: any) {
  const roles: string[] = [];
  const memberRoles = member?.roles?.cache;
  if (memberRoles) {
    memberRoles.forEach((role: any) => {
      roles.push(role.id);
      roles.push(role.name);
    });
  }
  const permissionFlags = member?.permissions?.toArray?.();
  if (Array.isArray(permissionFlags)) {
    permissionFlags.forEach((permission: any) => {
      roles.push(String(permission));
    });
  }
  return roles;
}

function buildMemberRoles(interaction: ChatInputCommandInteraction) {
  return buildRoleList(interaction.member as any);
}

async function checkCooldown(redis: IORedis, key: string, ttlSeconds: number) {
  const exists = await redis.get(key);
  if (exists) return false;
  await redis.set(key, "1", "EX", ttlSeconds);
  return true;
}

function passesPermissions(command: CommandPayload, interaction: ChatInputCommandInteraction) {
  const perms = command.permissions ?? {};
  if (perms.adminOnly) {
    const member = interaction.member as any;
    if (!member?.permissions?.has("Administrator")) {
      return false;
    }
  }
  if (perms.roleAllowlist && perms.roleAllowlist.length > 0) {
    const roles = buildMemberRoles(interaction);
    if (!perms.roleAllowlist.some((role) => roles.includes(role))) {
      return false;
    }
  }
  if (perms.channelAllowlist && perms.channelAllowlist.length > 0) {
    if (!perms.channelAllowlist.includes(interaction.channelId)) {
      return false;
    }
  }
  return true;
}

function passesMessagePermissions(command: CommandPayload, message: Message) {
  const perms = command.permissions ?? {};
  const member = message.member as any;

  if (perms.adminOnly) {
    if (!member?.permissions?.has?.("Administrator")) {
      return false;
    }
  }

  if (Array.isArray(perms.roleAllowlist) && perms.roleAllowlist.length > 0) {
    const roles = buildRoleList(member);
    if (!perms.roleAllowlist.some((role) => roles.includes(role))) {
      return false;
    }
  }

  if (Array.isArray(perms.channelAllowlist) && perms.channelAllowlist.length > 0) {
    if (!perms.channelAllowlist.includes(message.channelId)) {
      return false;
    }
  }

  return true;
}

function createVariableStore(botId: string, context: ExecutionContext) {
  return {
    async get(scope: "user" | "guild", key: string) {
      const scopeId = scope === "user" ? context.user.id : context.guild?.id ?? context.user.id;
      const record = await RunnerApi.getVariable(botId, scope, scopeId, key);
      return record?.value ?? null;
    },
    async set(scope: "user" | "guild", key: string, value: unknown) {
      const scopeId = scope === "user" ? context.user.id : context.guild?.id ?? context.user.id;
      await RunnerApi.setVariable(botId, scope, scopeId, key, value);
    }
  };
}

function createWorkflowHandlers(input: {
  botId: string;
  client: Client;
  interaction: WorkflowInteraction;
  commandName: string;
  executable: ExecutableWorkflow;
}): ActionHandlers {
  const { botId, client, interaction, commandName, executable } = input;

  return {
    reply: async (content: string, options?: { ephemeral?: boolean; buttons?: any[]; selectMenus?: any[] }) => {
      const rows = buildMessageComponents(botId, options);
      return safeReply(interaction, content, options?.ephemeral, rows.length ? rows : undefined);
    },
    sendChannel: async (channelId: string, content: string, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      const channel = await client.channels.fetch(channelId);
      if (channel && "send" in channel) {
        const rows = buildMessageComponents(botId, options);
        return (channel as any).send({ content, components: rows.length ? rows : undefined });
      }
      return null;
    },
    sendDm: async (content: string, options?: { targetUserId?: string; buttons?: any[]; selectMenus?: any[] }) => {
      const rows = buildMessageComponents(botId, options);
      const targetUserId = typeof options?.targetUserId === "string" ? options.targetUserId.trim() : "";
      const recipient = targetUserId ? await client.users.fetch(targetUserId) : interaction.user;
      return recipient.send({ content, components: rows.length ? rows : undefined });
    },
    sendEmbed: async (embedData: any, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      try {
        const embed = new EmbedBuilder();
        if (embedData.title) embed.setTitle(String(embedData.title));
        if (embedData.description) embed.setDescription(String(embedData.description));
        const embedUrl = normalizeUrl(embedData.url);
        if (embedUrl) embed.setURL(embedUrl);
        if (embedData.color) embed.setColor(String(embedData.color) as any);

        const footerText = typeof embedData.footer === "string" ? embedData.footer.trim() : undefined;
        const footerIcon = normalizeUrl(embedData.footerIconUrl);
        if (footerText) {
          embed.setFooter({ text: footerText, iconURL: footerIcon });
        }

        const authorName = typeof embedData.authorName === "string" ? embedData.authorName.trim() : undefined;
        const authorUrl = normalizeUrl(embedData.authorUrl);
        const authorIconUrl = normalizeUrl(embedData.authorIconUrl);
        if (authorName) {
          embed.setAuthor({
            name: authorName,
            iconURL: authorIconUrl,
            url: authorUrl
          });
        }
        if (embedData.timestamp) {
          const ts = embedData.timestamp === "now" ? new Date() : new Date(embedData.timestamp);
          if (!Number.isNaN(ts.getTime())) {
            embed.setTimestamp(ts);
          }
        }
        const thumbnailUrl = normalizeUrl(embedData.thumbnailUrl);
        if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
        const imageUrl = normalizeUrl(embedData.imageUrl);
        if (imageUrl) embed.setImage(imageUrl);
        if (Array.isArray(embedData.fields)) {
          const normalized = embedData.fields
            .filter((field: any) => field?.name && field?.value)
            .map((field: any) => ({
              name: String(field.name),
              value: String(field.value),
              inline: field.inline ?? false
            }));
          if (normalized.length > 0) {
            embed.setFields(normalized);
          }
        }
        const rows = buildMessageComponents(botId, options);
        const channelId = typeof embedData.channelId === "string" ? embedData.channelId.trim() : undefined;
        if (channelId) {
          const channel = await client.channels.fetch(channelId);
          if (channel && "send" in channel) {
            return (channel as any).send({ embeds: [embed], components: rows.length ? rows : undefined });
          }
        }
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({ embeds: [embed], components: rows.length ? rows : undefined });
        }
        await interaction.reply({ embeds: [embed], components: rows.length ? rows : undefined });
        return interaction.fetchReply();
      } catch (error: any) {
        const details = error?.rawError ?? error?.errors ?? error?.message ?? error;
        const detailText = typeof details === "string" ? details : JSON.stringify(details);
        logger.error({ error: details }, "Send embed failed");
        await RunnerApi.log(botId, "error", `Send embed failed: ${detailText}`, { error: details }).catch(() => undefined);
        throw new Error(`Send embed failed: ${detailText}`);
      }
    },
    registerInteraction: async ({ message, routes, buttons, selectMenus, context }) => {
      if (!message?.id) return;
      pruneExpiredSessions();

      const selectValueToOptionId: Record<string, Record<string, string>> = {};
      (selectMenus ?? []).forEach((menu: any) => {
        const menuId = String(menu?.id ?? "");
        if (!menuId) return;
        selectValueToOptionId[menuId] = {};
        (Array.isArray(menu?.options) ? menu.options : []).forEach((option: any) => {
          const optionId = String(option?.id ?? "");
          const optionValue = String(option?.value ?? "");
          if (optionId && optionValue) {
            selectValueToOptionId[menuId][optionValue] = optionId;
          }
        });
      });

      interactionSessions.set(String(message.id), {
        botId,
        commandName,
        executable,
        routes: { ...routes },
        context: cloneContext(context),
        selectValueToOptionId,
        expiresAt: Date.now() + INTERACTION_SESSION_TTL_MS
      });
    },
    addRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
      if (!interaction.guildId) return;
      const targetUserId = options?.targetUserId?.trim() || interaction.user.id;
      const member = await interaction.guild?.members.fetch(targetUserId);
      if (!member) {
        throw new Error(`Cannot find target member '${targetUserId}' in guild`);
      }
      await member.roles.add(roleId, options?.reason);
    },
    removeRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
      if (!interaction.guildId) return;
      const targetUserId = options?.targetUserId?.trim() || interaction.user.id;
      const member = await interaction.guild?.members.fetch(targetUserId);
      if (!member) {
        throw new Error(`Cannot find target member '${targetUserId}' in guild`);
      }
      await member.roles.remove(roleId, options?.reason);
    },
    log: async (level: "info" | "warn" | "error", message: string, meta?: any) => {
      logger[level]({ meta }, message);
      await RunnerApi.log(botId, level, message, meta);
    },
    httpRequest: async (data: HttpRequestData) => {
      const attempts = (data.retries ?? 0) + 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = data.timeoutMs ?? 5000;
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body,
            signal: controller.signal
          });
          clearTimeout(timer);
          let body: any = null;
          const text = await response.text();
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
          return { status: response.status, body };
        } catch (error) {
          clearTimeout(timer);
          if (attempt === attempts - 1) throw error;
        }
      }
      return { status: 500, body: null };
    }
  };
}

function createMessageEventHandlers(input: {
  botId: string;
  client: Client;
  message: Message;
  commandName: string;
  executable: ExecutableWorkflow;
}): ActionHandlers {
  const { botId, client, message, commandName, executable } = input;

  return {
    reply: async (content: string, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      const rows = buildMessageComponents(botId, options);
      return message.reply({ content, components: rows.length ? rows : undefined });
    },
    sendChannel: async (channelId: string, content: string, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      const channel = await client.channels.fetch(channelId);
      if (channel && "send" in channel) {
        const rows = buildMessageComponents(botId, options);
        return (channel as any).send({ content, components: rows.length ? rows : undefined });
      }
      return null;
    },
    sendDm: async (content: string, options?: { targetUserId?: string; buttons?: any[]; selectMenus?: any[] }) => {
      const rows = buildMessageComponents(botId, options);
      const targetUserId = typeof options?.targetUserId === "string" ? options.targetUserId.trim() : "";
      const recipient = targetUserId ? await client.users.fetch(targetUserId) : message.author;
      return recipient.send({ content, components: rows.length ? rows : undefined });
    },
    sendEmbed: async (embedData: any, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      try {
        const embed = new EmbedBuilder();
        if (embedData.title) embed.setTitle(String(embedData.title));
        if (embedData.description) embed.setDescription(String(embedData.description));
        const embedUrl = normalizeUrl(embedData.url);
        if (embedUrl) embed.setURL(embedUrl);
        if (embedData.color) embed.setColor(String(embedData.color) as any);

        const footerText = typeof embedData.footer === "string" ? embedData.footer.trim() : undefined;
        const footerIcon = normalizeUrl(embedData.footerIconUrl);
        if (footerText) {
          embed.setFooter({ text: footerText, iconURL: footerIcon });
        }

        const authorName = typeof embedData.authorName === "string" ? embedData.authorName.trim() : undefined;
        const authorUrl = normalizeUrl(embedData.authorUrl);
        const authorIconUrl = normalizeUrl(embedData.authorIconUrl);
        if (authorName) {
          embed.setAuthor({
            name: authorName,
            iconURL: authorIconUrl,
            url: authorUrl
          });
        }
        if (embedData.timestamp) {
          const ts = embedData.timestamp === "now" ? new Date() : new Date(embedData.timestamp);
          if (!Number.isNaN(ts.getTime())) {
            embed.setTimestamp(ts);
          }
        }
        const thumbnailUrl = normalizeUrl(embedData.thumbnailUrl);
        if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
        const imageUrl = normalizeUrl(embedData.imageUrl);
        if (imageUrl) embed.setImage(imageUrl);
        if (Array.isArray(embedData.fields)) {
          const normalized = embedData.fields
            .filter((field: any) => field?.name && field?.value)
            .map((field: any) => ({
              name: String(field.name),
              value: String(field.value),
              inline: field.inline ?? false
            }));
          if (normalized.length > 0) {
            embed.setFields(normalized);
          }
        }
        const rows = buildMessageComponents(botId, options);
        const channelId = typeof embedData.channelId === "string" ? embedData.channelId.trim() : undefined;
        if (channelId) {
          const channel = await client.channels.fetch(channelId);
          if (channel && "send" in channel) {
            return (channel as any).send({ embeds: [embed], components: rows.length ? rows : undefined });
          }
        }
        return message.reply({ embeds: [embed], components: rows.length ? rows : undefined });
      } catch (error: any) {
        const details = error?.rawError ?? error?.errors ?? error?.message ?? error;
        const detailText = typeof details === "string" ? details : JSON.stringify(details);
        logger.error({ error: details }, "Send embed failed");
        await RunnerApi.log(botId, "error", `Send embed failed: ${detailText}`, { error: details }).catch(() => undefined);
        throw new Error(`Send embed failed: ${detailText}`);
      }
    },
    registerInteraction: async ({ message: replyMessage, routes, selectMenus, context }) => {
      if (!replyMessage?.id) return;
      pruneExpiredSessions();

      const selectValueToOptionId: Record<string, Record<string, string>> = {};
      (selectMenus ?? []).forEach((menu: any) => {
        const menuId = String(menu?.id ?? "");
        if (!menuId) return;
        selectValueToOptionId[menuId] = {};
        (Array.isArray(menu?.options) ? menu.options : []).forEach((option: any) => {
          const optionId = String(option?.id ?? "");
          const optionValue = String(option?.value ?? "");
          if (optionId && optionValue) {
            selectValueToOptionId[menuId][optionValue] = optionId;
          }
        });
      });

      interactionSessions.set(String(replyMessage.id), {
        botId,
        commandName,
        executable,
        routes: { ...routes },
        context: cloneContext(context),
        selectValueToOptionId,
        expiresAt: Date.now() + INTERACTION_SESSION_TTL_MS
      });
    },
    addRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
      if (!message.guildId) return;
      const targetUserId = options?.targetUserId?.trim() || message.author.id;
      const member = await message.guild?.members.fetch(targetUserId);
      if (!member) {
        throw new Error(`Cannot find target member '${targetUserId}' in guild`);
      }
      await member.roles.add(roleId, options?.reason);
    },
    removeRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
      if (!message.guildId) return;
      const targetUserId = options?.targetUserId?.trim() || message.author.id;
      const member = await message.guild?.members.fetch(targetUserId);
      if (!member) {
        throw new Error(`Cannot find target member '${targetUserId}' in guild`);
      }
      await member.roles.remove(roleId, options?.reason);
    },
    log: async (level: "info" | "warn" | "error", eventMessage: string, meta?: any) => {
      logger[level]({ meta }, eventMessage);
      await RunnerApi.log(botId, level, eventMessage, meta);
    },
    httpRequest: async (data: HttpRequestData) => {
      const attempts = (data.retries ?? 0) + 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = data.timeoutMs ?? 5000;
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body,
            signal: controller.signal
          });
          clearTimeout(timer);
          let body: any = null;
          const text = await response.text();
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
          return { status: response.status, body };
        } catch (error) {
          clearTimeout(timer);
          if (attempt === attempts - 1) throw error;
        }
      }
      return { status: 500, body: null };
    }
  };
}

function createGenericEventHandlers(input: {
  botId: string;
  client: Client;
  context: ExecutionContext;
  defaultChannelId?: string;
  defaultUserId?: string;
}): ActionHandlers {
  const { botId, client, context, defaultChannelId, defaultUserId } = input;

  return {
    reply: async (content: string, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      const rows = buildMessageComponents(botId, options);
      if (defaultChannelId) {
        const channel = await client.channels.fetch(defaultChannelId).catch(() => null);
        if (channel && "send" in channel) {
          return (channel as any).send({ content, components: rows.length ? rows : undefined });
        }
      }

      const dmTarget = defaultUserId || context.user.id;
      if (dmTarget && dmTarget !== "system") {
        const user = await client.users.fetch(dmTarget).catch(() => null);
        if (user) {
          return user.send({ content, components: rows.length ? rows : undefined });
        }
      }

      await RunnerApi.log(botId, "warn", "reply() skipped: no channel/user available for event context").catch(() => undefined);
      return null;
    },
    sendChannel: async (channelId: string, content: string, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel && "send" in channel) {
        const rows = buildMessageComponents(botId, options);
        return (channel as any).send({ content, components: rows.length ? rows : undefined });
      }
      return null;
    },
    sendDm: async (content: string, options?: { targetUserId?: string; buttons?: any[]; selectMenus?: any[] }) => {
      const rows = buildMessageComponents(botId, options);
      const targetUserId = typeof options?.targetUserId === "string" ? options.targetUserId.trim() : "";
      const userId = targetUserId || defaultUserId || context.user.id;
      if (!userId || userId === "system") return null;
      const recipient = await client.users.fetch(userId).catch(() => null);
      if (!recipient) return null;
      return recipient.send({ content, components: rows.length ? rows : undefined });
    },
    sendEmbed: async (embedData: any, options?: { buttons?: any[]; selectMenus?: any[] }) => {
      try {
        const embed = new EmbedBuilder();
        if (embedData.title) embed.setTitle(String(embedData.title));
        if (embedData.description) embed.setDescription(String(embedData.description));
        const embedUrl = normalizeUrl(embedData.url);
        if (embedUrl) embed.setURL(embedUrl);
        if (embedData.color) embed.setColor(String(embedData.color) as any);

        const footerText = typeof embedData.footer === "string" ? embedData.footer.trim() : undefined;
        const footerIcon = normalizeUrl(embedData.footerIconUrl);
        if (footerText) {
          embed.setFooter({ text: footerText, iconURL: footerIcon });
        }

        const authorName = typeof embedData.authorName === "string" ? embedData.authorName.trim() : undefined;
        const authorUrl = normalizeUrl(embedData.authorUrl);
        const authorIconUrl = normalizeUrl(embedData.authorIconUrl);
        if (authorName) {
          embed.setAuthor({
            name: authorName,
            iconURL: authorIconUrl,
            url: authorUrl
          });
        }
        if (embedData.timestamp) {
          const ts = embedData.timestamp === "now" ? new Date() : new Date(embedData.timestamp);
          if (!Number.isNaN(ts.getTime())) {
            embed.setTimestamp(ts);
          }
        }
        const thumbnailUrl = normalizeUrl(embedData.thumbnailUrl);
        if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
        const imageUrl = normalizeUrl(embedData.imageUrl);
        if (imageUrl) embed.setImage(imageUrl);
        if (Array.isArray(embedData.fields)) {
          const normalized = embedData.fields
            .filter((field: any) => field?.name && field?.value)
            .map((field: any) => ({
              name: String(field.name),
              value: String(field.value),
              inline: field.inline ?? false
            }));
          if (normalized.length > 0) {
            embed.setFields(normalized);
          }
        }
        const rows = buildMessageComponents(botId, options);
        const explicitChannelId = typeof embedData.channelId === "string" ? embedData.channelId.trim() : undefined;
        const channelId = explicitChannelId || defaultChannelId;
        if (channelId) {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && "send" in channel) {
            return (channel as any).send({ embeds: [embed], components: rows.length ? rows : undefined });
          }
        }
        const dmTarget = defaultUserId || context.user.id;
        if (dmTarget && dmTarget !== "system") {
          const user = await client.users.fetch(dmTarget).catch(() => null);
          if (user) {
            return user.send({ embeds: [embed], components: rows.length ? rows : undefined });
          }
        }
        return null;
      } catch (error: any) {
        const details = error?.rawError ?? error?.errors ?? error?.message ?? error;
        const detailText = typeof details === "string" ? details : JSON.stringify(details);
        logger.error({ error: details }, "Send embed failed");
        await RunnerApi.log(botId, "error", `Send embed failed: ${detailText}`, { error: details }).catch(() => undefined);
        throw new Error(`Send embed failed: ${detailText}`);
      }
    },
    addRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
      const guildId = context.guild?.id;
      if (!guildId) return;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;
      const targetUserId = options?.targetUserId?.trim() || defaultUserId || context.user.id;
      if (!targetUserId || targetUserId === "system") return;
      const member = await guild.members.fetch(targetUserId).catch(() => null);
      if (!member) throw new Error(`Cannot find target member '${targetUserId}' in guild`);
      await member.roles.add(roleId, options?.reason);
    },
    removeRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
      const guildId = context.guild?.id;
      if (!guildId) return;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;
      const targetUserId = options?.targetUserId?.trim() || defaultUserId || context.user.id;
      if (!targetUserId || targetUserId === "system") return;
      const member = await guild.members.fetch(targetUserId).catch(() => null);
      if (!member) throw new Error(`Cannot find target member '${targetUserId}' in guild`);
      await member.roles.remove(roleId, options?.reason);
    },
    log: async (level: "info" | "warn" | "error", message: string, meta?: any) => {
      logger[level]({ meta }, message);
      await RunnerApi.log(botId, level, message, meta);
    },
    httpRequest: async (data: HttpRequestData) => {
      const attempts = (data.retries ?? 0) + 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = data.timeoutMs ?? 5000;
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body,
            signal: controller.signal
          });
          clearTimeout(timer);
          let body: any = null;
          const text = await response.text();
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
          return { status: response.status, body };
        } catch (error) {
          clearTimeout(timer);
          if (attempt === attempts - 1) throw error;
        }
      }
      return { status: 500, body: null };
    }
  };
}

function parseButtonCustomId(customId: string): { botId: string; buttonId: string } | null {
  if (!customId.startsWith("bg:")) return null;
  const parts = customId.split(":");
  if (parts.length < 3) return null;
  return {
    botId: parts[1],
    buttonId: parts.slice(2).join(":")
  };
}

function parseSelectCustomId(customId: string): { botId: string; menuId: string } | null {
  if (!customId.startsWith("bgsel:")) return null;
  const parts = customId.split(":");
  if (parts.length < 3) return null;
  return {
    botId: parts[1],
    menuId: parts.slice(2).join(":")
  };
}

function buildComponentContext(base: ExecutionContext, interaction: MessageComponentInteraction, extraVars: Record<string, unknown>): ExecutionContext {
  return {
    ...cloneContext(base),
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
      discriminator: interaction.user.discriminator
    },
    guild: interaction.guildId
      ? {
          id: interaction.guildId,
          name: interaction.guild?.name,
          iconUrl: interaction.guild?.iconURL() ?? undefined
        }
      : undefined,
    channel: interaction.channelId
      ? {
          id: interaction.channelId,
          name: (interaction.channel as any)?.name
        }
      : undefined,
    variables: {
      ...base.variables,
      ...extraVars
    }
  };
}

export async function handlePersistentComponentInteraction(
  botId: string,
  client: Client,
  interaction: MessageComponentInteraction,
  redis: IORedis
): Promise<boolean> {
  const buttonMeta = interaction.isButton() ? parseButtonCustomId(interaction.customId) : null;
  const selectMeta = interaction.isStringSelectMenu() ? parseSelectCustomId(interaction.customId) : null;

  if (!buttonMeta && !selectMeta) return false;

  const metaBotId = buttonMeta?.botId ?? selectMeta?.botId;
  if (metaBotId !== botId) return false;

  pruneExpiredSessions();
  const session = interactionSessions.get(interaction.message.id);
  if (!session) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "This interaction is no longer active. Run the command again.", flags: 1 << 6 }).catch(() => undefined);
    }
    return true;
  }

  let targetNodeId: string | undefined;
  let runContext: ExecutionContext | undefined;

  if (buttonMeta) {
    targetNodeId = session.routes[`button:${buttonMeta.buttonId}`];
    runContext = buildComponentContext(session.context, interaction, {
      clickedButtonId: buttonMeta.buttonId
    });
  } else if (selectMeta && interaction.isStringSelectMenu()) {
    const selectedValue = interaction.values?.[0];
    const optionId = session.selectValueToOptionId[selectMeta.menuId]?.[String(selectedValue ?? "")];
    if (optionId) {
      targetNodeId = session.routes[`select:${selectMeta.menuId}:${optionId}`];
    }
    runContext = buildComponentContext(session.context, interaction, {
      selectedMenuId: selectMeta.menuId,
      selectedOptionId: optionId ?? null,
      selectedOptionValue: selectedValue ?? null
    });
  }

  if (!targetNodeId || !runContext) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "No action configured for this interaction.", flags: 1 << 6 }).catch(() => undefined);
    }
    return true;
  }

  await interaction.deferUpdate().catch(() => undefined);

  const executable: ExecutableWorkflow = {
    ...session.executable,
    startNodeId: targetNodeId
  };
  const handlers = createWorkflowHandlers({
    botId,
    client,
    interaction,
    commandName: session.commandName,
    executable
  });
  const variableStore = createVariableStore(botId, runContext);
  const result = await executeWorkflow(executable, runContext, handlers, variableStore, { maxDurationMs: 60000 });
  if (result.error) {
    logger.warn({ error: result.error, botId }, "Persistent interaction execution failed");
    await RunnerApi.log(botId, "error", result.error).catch(() => undefined);
  }
  return true;
}

export async function executeCommand(
  botId: string,
  client: Client,
  interaction: ChatInputCommandInteraction,
  command: CommandPayload,
  redis: IORedis
) {
  if (!passesPermissions(command, interaction)) {
    await safeReply(interaction, "You do not have permission to run this command.", true);
    return;
  }

  const cooldownSeconds = command.cooldownSeconds ?? 0;
  if (cooldownSeconds > 0) {
    const allowed = await checkCooldown(redis, `cooldown:${botId}:${command.commandId}:${interaction.user.id}`, cooldownSeconds);
    if (!allowed) {
      await safeReply(interaction, `Please wait ${cooldownSeconds}s before using this command again.`, true);
      return;
    }
  }

  const context: ExecutionContext = {
    botId,
    commandName: command.name,
    user: { id: interaction.user.id, username: interaction.user.username },
    guild: interaction.guildId
      ? {
          id: interaction.guildId,
          name: interaction.guild?.name,
          iconUrl: interaction.guild?.iconURL() ?? undefined
        }
      : undefined,
    channel: interaction.channelId ? { id: interaction.channelId, name: (interaction.channel as any)?.name } : undefined,
    options: buildOptions(interaction),
    memberRoles: buildMemberRoles(interaction),
    variables: {}
  };

  const executable = command.version.compiledAstJson;
  const variableStore = createVariableStore(botId, context);
  const handlers = createWorkflowHandlers({
    botId,
    client,
    interaction,
    commandName: command.name,
    executable
  });

  try {
    const startedAt = Date.now();
    await RunnerApi.log(
      botId,
      "info",
      `/${command.name} invoked by ${interaction.user.username}`,
      { userId: interaction.user.id, command: command.name }
    ).catch(() => undefined);

    const result = await executeWorkflow(
      executable,
      context,
      handlers,
      variableStore,
      { maxDurationMs: 60000 }
    );
    if (result.error) {
      logger.warn({ error: result.error }, "Workflow execution reported error");
      if (!result.error.startsWith("Send embed failed:")) {
        await RunnerApi.log(botId, "error", result.error).catch(() => undefined);
      }
      await safeReply(interaction, "Something went wrong executing this command.", true);
      return;
    }

    if (!interaction.replied && !interaction.deferred) {
      await safeReply(interaction, "Done.", true);
    }

    const durationMs = Date.now() - startedAt;
    await RunnerApi.log(
      botId,
      "info",
      `/${command.name} completed`,
      { durationMs, command: command.name }
    ).catch(() => undefined);
  } catch (error: any) {
    logger.error({ error }, "Execution failed");
    await RunnerApi.log(botId, "error", error?.message ?? "Execution failed").catch(() => undefined);
    await safeReply(interaction, "Something went wrong executing this command.", true);
  }
}

export async function executePrefixCommand(
  botId: string,
  client: Client,
  message: Message,
  command: CommandPayload,
  redis: IORedis,
  args: string[]
) {
  if (!passesMessagePermissions(command, message)) {
    await message.reply("You do not have permission to run this command.").catch(() => undefined);
    return;
  }

  const cooldownSeconds = command.cooldownSeconds ?? 0;
  const commandId = command.commandId ?? command.id ?? command.name;
  if (cooldownSeconds > 0) {
    const allowed = await checkCooldown(redis, `cooldown:${botId}:${commandId}:${message.author.id}`, cooldownSeconds);
    if (!allowed) {
      await message.reply(`Please wait ${cooldownSeconds}s before using this command again.`).catch(() => undefined);
      return;
    }
  }

  const context: ExecutionContext = {
    botId,
    commandName: command.name,
    user: {
      id: message.author.id,
      username: message.author.username,
      discriminator: message.author.discriminator
    },
    guild: message.guildId
      ? {
          id: message.guildId,
          name: message.guild?.name,
          iconUrl: message.guild?.iconURL() ?? undefined
        }
      : undefined,
    channel: message.channelId ? { id: message.channelId, name: (message.channel as any)?.name } : undefined,
    options: parsePrefixOptions(command, args),
    memberRoles: buildRoleList(message.member as any),
    variables: {}
  };

  const executable = command.version.compiledAstJson;
  const variableStore = createVariableStore(botId, context);
  const handlers = createMessageEventHandlers({
    botId,
    client,
    message,
    commandName: command.name,
    executable
  });

  try {
    const startedAt = Date.now();
    await RunnerApi.log(
      botId,
      "info",
      `prefix:${command.name} invoked by ${message.author.username}`,
      { userId: message.author.id, command: command.name, args }
    ).catch(() => undefined);

    const result = await executeWorkflow(executable, context, handlers, variableStore, { maxDurationMs: 60000 });
    if (result.error) {
      logger.warn({ error: result.error }, "Prefix workflow execution reported error");
      if (!result.error.startsWith("Send embed failed:")) {
        await RunnerApi.log(botId, "error", result.error).catch(() => undefined);
      }
      await message.reply("Something went wrong executing this command.").catch(() => undefined);
      return;
    }

    const durationMs = Date.now() - startedAt;
    await RunnerApi.log(
      botId,
      "info",
      `prefix:${command.name} completed`,
      { durationMs, command: command.name }
    ).catch(() => undefined);
  } catch (error: any) {
    logger.error({ error }, "Prefix execution failed");
    await RunnerApi.log(botId, "error", error?.message ?? "Prefix execution failed").catch(() => undefined);
    await message.reply("Something went wrong executing this command.").catch(() => undefined);
  }
}

function buildGenericEventContext(botId: string, event: EventPayload, runtime: GenericEventRuntime): ExecutionContext {
  const fallbackUser: { id: string; username: string; discriminator?: string } =
    runtime.defaultUserId && runtime.defaultUserId !== "system"
    ? { id: runtime.defaultUserId, username: `user:${runtime.defaultUserId}` }
    : { id: "system", username: "system" };

  const user: { id: string; username: string; discriminator?: string } = runtime.user ?? fallbackUser;
  return {
    botId,
    commandName: event.name,
    user: {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator
    },
    guild: runtime.guild,
    channel: runtime.channel,
    options: runtime.options ?? {},
    memberRoles: runtime.memberRoles ?? [],
    variables: {}
  };
}

export async function executeGenericEvent(
  botId: string,
  client: Client,
  event: EventPayload,
  runtime: GenericEventRuntime
) {
  const executable = event?.version?.compiledAstJson;
  if (!executable) return;

  const context = buildGenericEventContext(botId, event, runtime);
  const variableStore = createVariableStore(botId, context);
  const handlers = createGenericEventHandlers({
    botId,
    client,
    context,
    defaultChannelId: runtime.defaultChannelId,
    defaultUserId: runtime.defaultUserId
  });

  try {
    const startedAt = Date.now();
    await RunnerApi.log(
      botId,
      "info",
      `event:${event.eventType ?? event.type} triggered`,
      {
        eventName: event.name,
        eventType: event.eventType ?? event.type,
        userId: context.user.id,
        channelId: context.channel?.id ?? null
      }
    ).catch(() => undefined);

    const result = await executeWorkflow(executable, context, handlers, variableStore, {
      maxDurationMs: 60000
    });

    if (result.error) {
      logger.warn({ error: result.error, event: event.name }, "Event workflow execution reported error");
      if (!result.error.startsWith("Send embed failed:")) {
        await RunnerApi.log(botId, "error", result.error, {
          eventName: event.name,
          eventType: event.eventType ?? event.type
        }).catch(() => undefined);
      }
      return;
    }

    await RunnerApi.log(
      botId,
      "info",
      `event:${event.eventType ?? event.type} completed`,
      {
        eventName: event.name,
        eventType: event.eventType ?? event.type,
        durationMs: Date.now() - startedAt
      }
    ).catch(() => undefined);
  } catch (error: any) {
    logger.error({ error, event: event.name }, "Event execution failed");
    await RunnerApi.log(botId, "error", error?.message ?? "Event execution failed", {
      eventName: event.name,
      eventType: event.eventType ?? event.type
    }).catch(() => undefined);
  }
}

export async function executeMessageCreateEvent(
  botId: string,
  client: Client,
  message: Message,
  event: EventPayload
) {
  const executable = event?.version?.compiledAstJson;
  if (!executable) return;

  const context: ExecutionContext = {
    botId,
    commandName: event.name,
    user: {
      id: message.author.id,
      username: message.author.username,
      discriminator: message.author.discriminator
    },
    guild: message.guildId
      ? {
          id: message.guildId,
          name: message.guild?.name,
          iconUrl: message.guild?.iconURL() ?? undefined
        }
      : undefined,
    channel: {
      id: message.channelId,
      name: (message.channel as any)?.name
    },
    options: {
      messageId: message.id,
      messageContent: message.content,
      channelId: message.channelId,
      userId: message.author.id,
      attachments: message.attachments.map((attachment) => attachment.url)
    },
    memberRoles: buildRoleList(message.member as any),
    variables: {}
  };

  const variableStore = createVariableStore(botId, context);
  const handlers = createMessageEventHandlers({
    botId,
    client,
    message,
    commandName: event.name,
    executable
  });

  try {
    const startedAt = Date.now();
    await RunnerApi.log(
      botId,
      "info",
      `event:${event.eventType ?? event.type} triggered by ${message.author.username}`,
      {
        eventName: event.name,
        eventType: event.eventType ?? event.type,
        userId: message.author.id,
        channelId: message.channelId
      }
    ).catch(() => undefined);

    const result = await executeWorkflow(executable, context, handlers, variableStore, {
      maxDurationMs: 60000
    });

    if (result.error) {
      logger.warn({ error: result.error, event: event.name }, "Event workflow execution reported error");
      if (!result.error.startsWith("Send embed failed:")) {
        await RunnerApi.log(botId, "error", result.error, {
          eventName: event.name,
          eventType: event.eventType ?? event.type
        }).catch(() => undefined);
      }
      return;
    }

    await RunnerApi.log(
      botId,
      "info",
      `event:${event.eventType ?? event.type} completed`,
      {
        eventName: event.name,
        eventType: event.eventType ?? event.type,
        durationMs: Date.now() - startedAt
      }
    ).catch(() => undefined);
  } catch (error: any) {
    logger.error({ error, event: event.name }, "Event execution failed");
    await RunnerApi.log(botId, "error", error?.message ?? "Event execution failed", {
      eventName: event.name,
      eventType: event.eventType ?? event.type
    }).catch(() => undefined);
  }
}
