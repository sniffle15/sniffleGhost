"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePersistentComponentInteraction = handlePersistentComponentInteraction;
exports.executeCommand = executeCommand;
exports.executePrefixCommand = executePrefixCommand;
exports.executeGenericEvent = executeGenericEvent;
exports.executeMessageCreateEvent = executeMessageCreateEvent;
const discord_js_1 = require("discord.js");
const shared_1 = require("@botghost/shared");
const api_1 = require("./api");
const logging_1 = require("./logging");
const interactionSessions = new Map();
const INTERACTION_SESSION_TTL_MS = Number(process.env.INTERACTION_SESSION_TTL_MS ?? "86400000");
function cloneContext(context) {
    return JSON.parse(JSON.stringify(context));
}
function pruneExpiredSessions() {
    const now = Date.now();
    for (const [messageId, session] of interactionSessions.entries()) {
        if (session.expiresAt <= now) {
            interactionSessions.delete(messageId);
        }
    }
}
function buildOptions(interaction) {
    const options = {};
    for (const opt of interaction.options.data) {
        options[opt.name] = opt.value ?? opt.options?.map((sub) => sub.value) ?? null;
    }
    return options;
}
function coercePrefixArg(rawValue, type) {
    switch (String(type ?? "string").toLowerCase()) {
        case "int": {
            const value = Number(rawValue);
            return Number.isFinite(value) ? value : null;
        }
        case "bool": {
            const normalized = rawValue.trim().toLowerCase();
            if (["true", "1", "yes", "on", "y"].includes(normalized))
                return true;
            if (["false", "0", "no", "off", "n"].includes(normalized))
                return false;
            return null;
        }
        default:
            return rawValue;
    }
}
function parsePrefixOptions(command, args) {
    const optionDefs = Array.isArray(command.options) ? command.options : [];
    const parsed = {};
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
function buttonStyleToDiscord(style) {
    switch (String(style ?? "SECONDARY").toUpperCase()) {
        case "PRIMARY":
            return discord_js_1.ButtonStyle.Primary;
        case "SUCCESS":
            return discord_js_1.ButtonStyle.Success;
        case "DANGER":
            return discord_js_1.ButtonStyle.Danger;
        case "LINK":
            return discord_js_1.ButtonStyle.Link;
        case "SECONDARY":
        default:
            return discord_js_1.ButtonStyle.Secondary;
    }
}
function buildButtonRows(botId, buttons = []) {
    const rows = [];
    let current = new discord_js_1.ActionRowBuilder();
    const sanitized = buttons.filter((btn) => btn?.label);
    sanitized.forEach((btn, index) => {
        const style = buttonStyleToDiscord(btn.style);
        const builder = new discord_js_1.ButtonBuilder()
            .setLabel(String(btn.label))
            .setStyle(style)
            .setDisabled(Boolean(btn.disabled));
        if (style === discord_js_1.ButtonStyle.Link) {
            const url = normalizeUrl(btn.url);
            if (!url)
                return;
            builder.setURL(url);
        }
        else {
            const customId = `bg:${botId}:${btn.id ?? index}`;
            builder.setCustomId(customId);
        }
        if ((current.components?.length ?? 0) >= 5) {
            rows.push(current);
            current = new discord_js_1.ActionRowBuilder();
        }
        current.addComponents(builder);
    });
    if (current.components?.length) {
        rows.push(current);
    }
    return rows;
}
function normalizeBounds(min, max, optionCount) {
    const safeMin = Math.max(0, Math.min(min ?? 1, optionCount));
    const safeMax = Math.max(safeMin || 1, Math.min(max ?? 1, optionCount));
    return { min: safeMin || 1, max: safeMax };
}
function buildSelectMenuRows(botId, selectMenus = []) {
    const rows = [];
    const menus = selectMenus.filter((menu) => menu?.id && Array.isArray(menu.options) && menu.options.some((option) => option?.label && option?.value));
    menus.forEach((menu) => {
        const options = menu.options
            .filter((option) => option?.label && option?.value)
            .slice(0, 25)
            .map((option) => ({
            label: String(option.label).slice(0, 100),
            value: String(option.value).slice(0, 100),
            description: option.description ? String(option.description).slice(0, 100) : undefined,
            default: Boolean(option.default)
        }));
        if (options.length === 0)
            return;
        const bounds = normalizeBounds(menu.minValues, menu.maxValues, options.length);
        const builder = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`bgsel:${botId}:${menu.id}`)
            .setMinValues(bounds.min)
            .setMaxValues(bounds.max)
            .setDisabled(Boolean(menu.disabled))
            .addOptions(options);
        if (menu.placeholder) {
            builder.setPlaceholder(String(menu.placeholder).slice(0, 150));
        }
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(builder));
    });
    return rows;
}
function buildMessageComponents(botId, input = {}) {
    const buttonRows = buildButtonRows(botId, input.buttons ?? []);
    const selectRows = buildSelectMenuRows(botId, input.selectMenus ?? []);
    return [...buttonRows, ...selectRows].slice(0, 5);
}
function normalizeUrl(value) {
    if (!value)
        return undefined;
    const trimmed = String(value).trim();
    if (!trimmed)
        return undefined;
    try {
        const url = new URL(trimmed);
        return url.toString();
    }
    catch {
        return undefined;
    }
}
async function safeReply(interaction, content, ephemeral, components) {
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
function buildRoleList(member) {
    const roles = [];
    const memberRoles = member?.roles?.cache;
    if (memberRoles) {
        memberRoles.forEach((role) => {
            roles.push(role.id);
            roles.push(role.name);
        });
    }
    const permissionFlags = member?.permissions?.toArray?.();
    if (Array.isArray(permissionFlags)) {
        permissionFlags.forEach((permission) => {
            roles.push(String(permission));
        });
    }
    return roles;
}
function buildMemberRoles(interaction) {
    return buildRoleList(interaction.member);
}
async function checkCooldown(redis, key, ttlSeconds) {
    const exists = await redis.get(key);
    if (exists)
        return false;
    await redis.set(key, "1", "EX", ttlSeconds);
    return true;
}
function passesPermissions(command, interaction) {
    const perms = command.permissions ?? {};
    if (perms.adminOnly) {
        const member = interaction.member;
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
function passesMessagePermissions(command, message) {
    const perms = command.permissions ?? {};
    const member = message.member;
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
function createVariableStore(botId, context) {
    return {
        async get(scope, key) {
            const scopeId = scope === "user" ? context.user.id : context.guild?.id ?? context.user.id;
            const record = await api_1.RunnerApi.getVariable(botId, scope, scopeId, key);
            return record?.value ?? null;
        },
        async set(scope, key, value) {
            const scopeId = scope === "user" ? context.user.id : context.guild?.id ?? context.user.id;
            await api_1.RunnerApi.setVariable(botId, scope, scopeId, key, value);
        }
    };
}
function createWorkflowHandlers(input) {
    const { botId, client, interaction, commandName, executable } = input;
    return {
        reply: async (content, options) => {
            const rows = buildMessageComponents(botId, options);
            return safeReply(interaction, content, options?.ephemeral, rows.length ? rows : undefined);
        },
        sendChannel: async (channelId, content, options) => {
            const channel = await client.channels.fetch(channelId);
            if (channel && "send" in channel) {
                const rows = buildMessageComponents(botId, options);
                return channel.send({ content, components: rows.length ? rows : undefined });
            }
            return null;
        },
        sendDm: async (content, options) => {
            const rows = buildMessageComponents(botId, options);
            const targetUserId = typeof options?.targetUserId === "string" ? options.targetUserId.trim() : "";
            const recipient = targetUserId ? await client.users.fetch(targetUserId) : interaction.user;
            return recipient.send({ content, components: rows.length ? rows : undefined });
        },
        sendEmbed: async (embedData, options) => {
            try {
                const embed = new discord_js_1.EmbedBuilder();
                if (embedData.title)
                    embed.setTitle(String(embedData.title));
                if (embedData.description)
                    embed.setDescription(String(embedData.description));
                const embedUrl = normalizeUrl(embedData.url);
                if (embedUrl)
                    embed.setURL(embedUrl);
                if (embedData.color)
                    embed.setColor(String(embedData.color));
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
                if (thumbnailUrl)
                    embed.setThumbnail(thumbnailUrl);
                const imageUrl = normalizeUrl(embedData.imageUrl);
                if (imageUrl)
                    embed.setImage(imageUrl);
                if (Array.isArray(embedData.fields)) {
                    const normalized = embedData.fields
                        .filter((field) => field?.name && field?.value)
                        .map((field) => ({
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
                        return channel.send({ embeds: [embed], components: rows.length ? rows : undefined });
                    }
                }
                if (interaction.replied || interaction.deferred) {
                    return interaction.followUp({ embeds: [embed], components: rows.length ? rows : undefined });
                }
                await interaction.reply({ embeds: [embed], components: rows.length ? rows : undefined });
                return interaction.fetchReply();
            }
            catch (error) {
                const details = error?.rawError ?? error?.errors ?? error?.message ?? error;
                const detailText = typeof details === "string" ? details : JSON.stringify(details);
                logging_1.logger.error({ error: details }, "Send embed failed");
                await api_1.RunnerApi.log(botId, "error", `Send embed failed: ${detailText}`, { error: details }).catch(() => undefined);
                throw new Error(`Send embed failed: ${detailText}`);
            }
        },
        registerInteraction: async ({ message, routes, buttons, selectMenus, context }) => {
            if (!message?.id)
                return;
            pruneExpiredSessions();
            const selectValueToOptionId = {};
            (selectMenus ?? []).forEach((menu) => {
                const menuId = String(menu?.id ?? "");
                if (!menuId)
                    return;
                selectValueToOptionId[menuId] = {};
                (Array.isArray(menu?.options) ? menu.options : []).forEach((option) => {
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
        addRole: async (roleId, options) => {
            if (!interaction.guildId)
                return;
            const targetUserId = options?.targetUserId?.trim() || interaction.user.id;
            const member = await interaction.guild?.members.fetch(targetUserId);
            if (!member) {
                throw new Error(`Cannot find target member '${targetUserId}' in guild`);
            }
            await member.roles.add(roleId, options?.reason);
        },
        removeRole: async (roleId, options) => {
            if (!interaction.guildId)
                return;
            const targetUserId = options?.targetUserId?.trim() || interaction.user.id;
            const member = await interaction.guild?.members.fetch(targetUserId);
            if (!member) {
                throw new Error(`Cannot find target member '${targetUserId}' in guild`);
            }
            await member.roles.remove(roleId, options?.reason);
        },
        log: async (level, message, meta) => {
            logging_1.logger[level]({ meta }, message);
            await api_1.RunnerApi.log(botId, level, message, meta);
        },
        httpRequest: async (data) => {
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
                    let body = null;
                    const text = await response.text();
                    try {
                        body = JSON.parse(text);
                    }
                    catch {
                        body = text;
                    }
                    return { status: response.status, body };
                }
                catch (error) {
                    clearTimeout(timer);
                    if (attempt === attempts - 1)
                        throw error;
                }
            }
            return { status: 500, body: null };
        }
    };
}
function createMessageEventHandlers(input) {
    const { botId, client, message, commandName, executable } = input;
    return {
        reply: async (content, options) => {
            const rows = buildMessageComponents(botId, options);
            return message.reply({ content, components: rows.length ? rows : undefined });
        },
        sendChannel: async (channelId, content, options) => {
            const channel = await client.channels.fetch(channelId);
            if (channel && "send" in channel) {
                const rows = buildMessageComponents(botId, options);
                return channel.send({ content, components: rows.length ? rows : undefined });
            }
            return null;
        },
        sendDm: async (content, options) => {
            const rows = buildMessageComponents(botId, options);
            const targetUserId = typeof options?.targetUserId === "string" ? options.targetUserId.trim() : "";
            const recipient = targetUserId ? await client.users.fetch(targetUserId) : message.author;
            return recipient.send({ content, components: rows.length ? rows : undefined });
        },
        sendEmbed: async (embedData, options) => {
            try {
                const embed = new discord_js_1.EmbedBuilder();
                if (embedData.title)
                    embed.setTitle(String(embedData.title));
                if (embedData.description)
                    embed.setDescription(String(embedData.description));
                const embedUrl = normalizeUrl(embedData.url);
                if (embedUrl)
                    embed.setURL(embedUrl);
                if (embedData.color)
                    embed.setColor(String(embedData.color));
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
                if (thumbnailUrl)
                    embed.setThumbnail(thumbnailUrl);
                const imageUrl = normalizeUrl(embedData.imageUrl);
                if (imageUrl)
                    embed.setImage(imageUrl);
                if (Array.isArray(embedData.fields)) {
                    const normalized = embedData.fields
                        .filter((field) => field?.name && field?.value)
                        .map((field) => ({
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
                        return channel.send({ embeds: [embed], components: rows.length ? rows : undefined });
                    }
                }
                return message.reply({ embeds: [embed], components: rows.length ? rows : undefined });
            }
            catch (error) {
                const details = error?.rawError ?? error?.errors ?? error?.message ?? error;
                const detailText = typeof details === "string" ? details : JSON.stringify(details);
                logging_1.logger.error({ error: details }, "Send embed failed");
                await api_1.RunnerApi.log(botId, "error", `Send embed failed: ${detailText}`, { error: details }).catch(() => undefined);
                throw new Error(`Send embed failed: ${detailText}`);
            }
        },
        registerInteraction: async ({ message: replyMessage, routes, selectMenus, context }) => {
            if (!replyMessage?.id)
                return;
            pruneExpiredSessions();
            const selectValueToOptionId = {};
            (selectMenus ?? []).forEach((menu) => {
                const menuId = String(menu?.id ?? "");
                if (!menuId)
                    return;
                selectValueToOptionId[menuId] = {};
                (Array.isArray(menu?.options) ? menu.options : []).forEach((option) => {
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
        addRole: async (roleId, options) => {
            if (!message.guildId)
                return;
            const targetUserId = options?.targetUserId?.trim() || message.author.id;
            const member = await message.guild?.members.fetch(targetUserId);
            if (!member) {
                throw new Error(`Cannot find target member '${targetUserId}' in guild`);
            }
            await member.roles.add(roleId, options?.reason);
        },
        removeRole: async (roleId, options) => {
            if (!message.guildId)
                return;
            const targetUserId = options?.targetUserId?.trim() || message.author.id;
            const member = await message.guild?.members.fetch(targetUserId);
            if (!member) {
                throw new Error(`Cannot find target member '${targetUserId}' in guild`);
            }
            await member.roles.remove(roleId, options?.reason);
        },
        log: async (level, eventMessage, meta) => {
            logging_1.logger[level]({ meta }, eventMessage);
            await api_1.RunnerApi.log(botId, level, eventMessage, meta);
        },
        httpRequest: async (data) => {
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
                    let body = null;
                    const text = await response.text();
                    try {
                        body = JSON.parse(text);
                    }
                    catch {
                        body = text;
                    }
                    return { status: response.status, body };
                }
                catch (error) {
                    clearTimeout(timer);
                    if (attempt === attempts - 1)
                        throw error;
                }
            }
            return { status: 500, body: null };
        }
    };
}
function createGenericEventHandlers(input) {
    const { botId, client, context, defaultChannelId, defaultUserId } = input;
    return {
        reply: async (content, options) => {
            const rows = buildMessageComponents(botId, options);
            if (defaultChannelId) {
                const channel = await client.channels.fetch(defaultChannelId).catch(() => null);
                if (channel && "send" in channel) {
                    return channel.send({ content, components: rows.length ? rows : undefined });
                }
            }
            const dmTarget = defaultUserId || context.user.id;
            if (dmTarget && dmTarget !== "system") {
                const user = await client.users.fetch(dmTarget).catch(() => null);
                if (user) {
                    return user.send({ content, components: rows.length ? rows : undefined });
                }
            }
            await api_1.RunnerApi.log(botId, "warn", "reply() skipped: no channel/user available for event context").catch(() => undefined);
            return null;
        },
        sendChannel: async (channelId, content, options) => {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel && "send" in channel) {
                const rows = buildMessageComponents(botId, options);
                return channel.send({ content, components: rows.length ? rows : undefined });
            }
            return null;
        },
        sendDm: async (content, options) => {
            const rows = buildMessageComponents(botId, options);
            const targetUserId = typeof options?.targetUserId === "string" ? options.targetUserId.trim() : "";
            const userId = targetUserId || defaultUserId || context.user.id;
            if (!userId || userId === "system")
                return null;
            const recipient = await client.users.fetch(userId).catch(() => null);
            if (!recipient)
                return null;
            return recipient.send({ content, components: rows.length ? rows : undefined });
        },
        sendEmbed: async (embedData, options) => {
            try {
                const embed = new discord_js_1.EmbedBuilder();
                if (embedData.title)
                    embed.setTitle(String(embedData.title));
                if (embedData.description)
                    embed.setDescription(String(embedData.description));
                const embedUrl = normalizeUrl(embedData.url);
                if (embedUrl)
                    embed.setURL(embedUrl);
                if (embedData.color)
                    embed.setColor(String(embedData.color));
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
                if (thumbnailUrl)
                    embed.setThumbnail(thumbnailUrl);
                const imageUrl = normalizeUrl(embedData.imageUrl);
                if (imageUrl)
                    embed.setImage(imageUrl);
                if (Array.isArray(embedData.fields)) {
                    const normalized = embedData.fields
                        .filter((field) => field?.name && field?.value)
                        .map((field) => ({
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
                        return channel.send({ embeds: [embed], components: rows.length ? rows : undefined });
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
            }
            catch (error) {
                const details = error?.rawError ?? error?.errors ?? error?.message ?? error;
                const detailText = typeof details === "string" ? details : JSON.stringify(details);
                logging_1.logger.error({ error: details }, "Send embed failed");
                await api_1.RunnerApi.log(botId, "error", `Send embed failed: ${detailText}`, { error: details }).catch(() => undefined);
                throw new Error(`Send embed failed: ${detailText}`);
            }
        },
        addRole: async (roleId, options) => {
            const guildId = context.guild?.id;
            if (!guildId)
                return;
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild)
                return;
            const targetUserId = options?.targetUserId?.trim() || defaultUserId || context.user.id;
            if (!targetUserId || targetUserId === "system")
                return;
            const member = await guild.members.fetch(targetUserId).catch(() => null);
            if (!member)
                throw new Error(`Cannot find target member '${targetUserId}' in guild`);
            await member.roles.add(roleId, options?.reason);
        },
        removeRole: async (roleId, options) => {
            const guildId = context.guild?.id;
            if (!guildId)
                return;
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild)
                return;
            const targetUserId = options?.targetUserId?.trim() || defaultUserId || context.user.id;
            if (!targetUserId || targetUserId === "system")
                return;
            const member = await guild.members.fetch(targetUserId).catch(() => null);
            if (!member)
                throw new Error(`Cannot find target member '${targetUserId}' in guild`);
            await member.roles.remove(roleId, options?.reason);
        },
        log: async (level, message, meta) => {
            logging_1.logger[level]({ meta }, message);
            await api_1.RunnerApi.log(botId, level, message, meta);
        },
        httpRequest: async (data) => {
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
                    let body = null;
                    const text = await response.text();
                    try {
                        body = JSON.parse(text);
                    }
                    catch {
                        body = text;
                    }
                    return { status: response.status, body };
                }
                catch (error) {
                    clearTimeout(timer);
                    if (attempt === attempts - 1)
                        throw error;
                }
            }
            return { status: 500, body: null };
        }
    };
}
function parseButtonCustomId(customId) {
    if (!customId.startsWith("bg:"))
        return null;
    const parts = customId.split(":");
    if (parts.length < 3)
        return null;
    return {
        botId: parts[1],
        buttonId: parts.slice(2).join(":")
    };
}
function parseSelectCustomId(customId) {
    if (!customId.startsWith("bgsel:"))
        return null;
    const parts = customId.split(":");
    if (parts.length < 3)
        return null;
    return {
        botId: parts[1],
        menuId: parts.slice(2).join(":")
    };
}
function buildComponentContext(base, interaction, extraVars) {
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
                name: interaction.channel?.name
            }
            : undefined,
        variables: {
            ...base.variables,
            ...extraVars
        }
    };
}
async function handlePersistentComponentInteraction(botId, client, interaction, redis) {
    const buttonMeta = interaction.isButton() ? parseButtonCustomId(interaction.customId) : null;
    const selectMeta = interaction.isStringSelectMenu() ? parseSelectCustomId(interaction.customId) : null;
    if (!buttonMeta && !selectMeta)
        return false;
    const metaBotId = buttonMeta?.botId ?? selectMeta?.botId;
    if (metaBotId !== botId)
        return false;
    pruneExpiredSessions();
    const session = interactionSessions.get(interaction.message.id);
    if (!session) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "This interaction is no longer active. Run the command again.", flags: 1 << 6 }).catch(() => undefined);
        }
        return true;
    }
    let targetNodeId;
    let runContext;
    if (buttonMeta) {
        targetNodeId = session.routes[`button:${buttonMeta.buttonId}`];
        runContext = buildComponentContext(session.context, interaction, {
            clickedButtonId: buttonMeta.buttonId
        });
    }
    else if (selectMeta && interaction.isStringSelectMenu()) {
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
    const executable = {
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
    const result = await (0, shared_1.executeWorkflow)(executable, runContext, handlers, variableStore, { maxDurationMs: 60000 });
    if (result.error) {
        logging_1.logger.warn({ error: result.error, botId }, "Persistent interaction execution failed");
        await api_1.RunnerApi.log(botId, "error", result.error).catch(() => undefined);
    }
    return true;
}
async function executeCommand(botId, client, interaction, command, redis) {
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
    const context = {
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
        channel: interaction.channelId ? { id: interaction.channelId, name: interaction.channel?.name } : undefined,
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
        await api_1.RunnerApi.log(botId, "info", `/${command.name} invoked by ${interaction.user.username}`, { userId: interaction.user.id, command: command.name }).catch(() => undefined);
        const result = await (0, shared_1.executeWorkflow)(executable, context, handlers, variableStore, { maxDurationMs: 60000 });
        if (result.error) {
            logging_1.logger.warn({ error: result.error }, "Workflow execution reported error");
            if (!result.error.startsWith("Send embed failed:")) {
                await api_1.RunnerApi.log(botId, "error", result.error).catch(() => undefined);
            }
            await safeReply(interaction, "Something went wrong executing this command.", true);
            return;
        }
        if (!interaction.replied && !interaction.deferred) {
            await safeReply(interaction, "Done.", true);
        }
        const durationMs = Date.now() - startedAt;
        await api_1.RunnerApi.log(botId, "info", `/${command.name} completed`, { durationMs, command: command.name }).catch(() => undefined);
    }
    catch (error) {
        logging_1.logger.error({ error }, "Execution failed");
        await api_1.RunnerApi.log(botId, "error", error?.message ?? "Execution failed").catch(() => undefined);
        await safeReply(interaction, "Something went wrong executing this command.", true);
    }
}
async function executePrefixCommand(botId, client, message, command, redis, args) {
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
    const context = {
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
        channel: message.channelId ? { id: message.channelId, name: message.channel?.name } : undefined,
        options: parsePrefixOptions(command, args),
        memberRoles: buildRoleList(message.member),
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
        await api_1.RunnerApi.log(botId, "info", `prefix:${command.name} invoked by ${message.author.username}`, { userId: message.author.id, command: command.name, args }).catch(() => undefined);
        const result = await (0, shared_1.executeWorkflow)(executable, context, handlers, variableStore, { maxDurationMs: 60000 });
        if (result.error) {
            logging_1.logger.warn({ error: result.error }, "Prefix workflow execution reported error");
            if (!result.error.startsWith("Send embed failed:")) {
                await api_1.RunnerApi.log(botId, "error", result.error).catch(() => undefined);
            }
            await message.reply("Something went wrong executing this command.").catch(() => undefined);
            return;
        }
        const durationMs = Date.now() - startedAt;
        await api_1.RunnerApi.log(botId, "info", `prefix:${command.name} completed`, { durationMs, command: command.name }).catch(() => undefined);
    }
    catch (error) {
        logging_1.logger.error({ error }, "Prefix execution failed");
        await api_1.RunnerApi.log(botId, "error", error?.message ?? "Prefix execution failed").catch(() => undefined);
        await message.reply("Something went wrong executing this command.").catch(() => undefined);
    }
}
function buildGenericEventContext(botId, event, runtime) {
    const fallbackUser = runtime.defaultUserId && runtime.defaultUserId !== "system"
        ? { id: runtime.defaultUserId, username: `user:${runtime.defaultUserId}` }
        : { id: "system", username: "system" };
    const user = runtime.user ?? fallbackUser;
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
async function executeGenericEvent(botId, client, event, runtime) {
    const executable = event?.version?.compiledAstJson;
    if (!executable)
        return;
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
        await api_1.RunnerApi.log(botId, "info", `event:${event.eventType ?? event.type} triggered`, {
            eventName: event.name,
            eventType: event.eventType ?? event.type,
            userId: context.user.id,
            channelId: context.channel?.id ?? null
        }).catch(() => undefined);
        const result = await (0, shared_1.executeWorkflow)(executable, context, handlers, variableStore, {
            maxDurationMs: 60000
        });
        if (result.error) {
            logging_1.logger.warn({ error: result.error, event: event.name }, "Event workflow execution reported error");
            if (!result.error.startsWith("Send embed failed:")) {
                await api_1.RunnerApi.log(botId, "error", result.error, {
                    eventName: event.name,
                    eventType: event.eventType ?? event.type
                }).catch(() => undefined);
            }
            return;
        }
        await api_1.RunnerApi.log(botId, "info", `event:${event.eventType ?? event.type} completed`, {
            eventName: event.name,
            eventType: event.eventType ?? event.type,
            durationMs: Date.now() - startedAt
        }).catch(() => undefined);
    }
    catch (error) {
        logging_1.logger.error({ error, event: event.name }, "Event execution failed");
        await api_1.RunnerApi.log(botId, "error", error?.message ?? "Event execution failed", {
            eventName: event.name,
            eventType: event.eventType ?? event.type
        }).catch(() => undefined);
    }
}
async function executeMessageCreateEvent(botId, client, message, event) {
    const executable = event?.version?.compiledAstJson;
    if (!executable)
        return;
    const context = {
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
            name: message.channel?.name
        },
        options: {
            messageId: message.id,
            messageContent: message.content,
            channelId: message.channelId,
            userId: message.author.id,
            attachments: message.attachments.map((attachment) => attachment.url)
        },
        memberRoles: buildRoleList(message.member),
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
        await api_1.RunnerApi.log(botId, "info", `event:${event.eventType ?? event.type} triggered by ${message.author.username}`, {
            eventName: event.name,
            eventType: event.eventType ?? event.type,
            userId: message.author.id,
            channelId: message.channelId
        }).catch(() => undefined);
        const result = await (0, shared_1.executeWorkflow)(executable, context, handlers, variableStore, {
            maxDurationMs: 60000
        });
        if (result.error) {
            logging_1.logger.warn({ error: result.error, event: event.name }, "Event workflow execution reported error");
            if (!result.error.startsWith("Send embed failed:")) {
                await api_1.RunnerApi.log(botId, "error", result.error, {
                    eventName: event.name,
                    eventType: event.eventType ?? event.type
                }).catch(() => undefined);
            }
            return;
        }
        await api_1.RunnerApi.log(botId, "info", `event:${event.eventType ?? event.type} completed`, {
            eventName: event.name,
            eventType: event.eventType ?? event.type,
            durationMs: Date.now() - startedAt
        }).catch(() => undefined);
    }
    catch (error) {
        logging_1.logger.error({ error, event: event.name }, "Event execution failed");
        await api_1.RunnerApi.log(botId, "error", error?.message ?? "Event execution failed", {
            eventName: event.name,
            eventType: event.eventType ?? event.type
        }).catch(() => undefined);
    }
}
