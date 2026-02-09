import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { RunnerGuard } from "./runner.guard";
import { PrismaService } from "../common/prisma.service";
import { LogsService } from "../logs/logs.service";
import { ConfigService } from "@nestjs/config";
import { decryptTokenWithFallback, encryptToken } from "../common/encryption";
import { EventTypeSchema } from "@botghost/shared";

const RUNNER_COMMAND_TYPES = ["SLASH", "PREFIX"];
const RUNNER_EVENT_TYPES = EventTypeSchema.options;
const RUNNER_EVENT_COMMAND_TYPES = RUNNER_EVENT_TYPES.map((eventType) => `EVENT_${eventType}`);

@Controller("/runner")
@UseGuards(RunnerGuard)
export class RunnerController {
  constructor(
    private prisma: PrismaService,
    private logs: LogsService,
    private config: ConfigService
  ) {}

  @Get("/bots/:id/token")
  async getBotToken(@Param("id") id: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id } });
    if (!bot) return null;

    const secret = this.config.get<string>("ENCRYPTION_KEY") ?? "";
    const fallbackRaw = this.config.get<string>("ENCRYPTION_KEY_FALLBACKS") ?? "";
    const fallbackSecrets = fallbackRaw.split(",").map((item) => item.trim()).filter(Boolean);

    try {
      const resolved = decryptTokenWithFallback(bot.encryptedToken, [secret, ...fallbackSecrets]);
      if (resolved.usedSecret !== secret && secret) {
        // Re-encrypt with current primary key if decryption needed a fallback key.
        await this.prisma.bot.update({
          where: { id: bot.id },
          data: { encryptedToken: encryptToken(resolved.token, secret), lastError: null }
        });
      }

      return {
        botId: bot.id,
        applicationId: bot.applicationId,
        testGuildId: bot.testGuildId,
        prefix: bot.prefix,
        token: resolved.token
      };
    } catch (error: any) {
      const message = "Bot token could not be decrypted. Re-save the token in bot settings.";
      await this.prisma.bot.update({
        where: { id: bot.id },
        data: { status: "error", lastError: message }
      });
      await this.logs.create(bot.id, "error", `${message} (${error?.message ?? "decrypt failed"})`);
      throw new BadRequestException(message);
    }
  }

  @Post("/bots/:id/heartbeat")
  async heartbeat(@Param("id") id: string, @Body() body: any) {
    await this.prisma.bot.update({
      where: { id },
      data: {
        status: body.status ?? "running",
        lastHeartbeat: new Date(),
        lastError: body.error ?? null
      }
    });
    return { success: true };
  }

  @Post("/bots/:id/logs")
  async createLog(@Param("id") id: string, @Body() body: any) {
    return this.logs.create(id, body.level ?? "info", body.message ?? "", body.meta);
  }

  @Get("/bots/:id/variables")
  async getVariable(
    @Param("id") id: string,
    @Query("scope") scope: string,
    @Query("scopeId") scopeId: string,
    @Query("key") key: string
  ) {
    if (!scope || !scopeId || !key) return null;
    return this.prisma.persistentVariable.findFirst({
      where: { botId: id, scope, scopeId, key }
    });
  }

  @Put("/bots/:id/variables")
  async setVariable(@Param("id") id: string, @Body() body: any) {
    const { scope, scopeId, key, value } = body ?? {};
    return this.prisma.persistentVariable.upsert({
      where: { botId_scope_scopeId_key: { botId: id, scope, scopeId, key } },
      update: { value },
      create: { botId: id, scope, scopeId, key, value }
    });
  }

  @Get("/bots/:id/commands")
  async listPublishedCommands(@Param("id") id: string) {
    const commands = await this.prisma.command.findMany({
      where: { botId: id, type: { in: RUNNER_COMMAND_TYPES } },
      include: {
        versions: {
          where: { status: "published" },
          orderBy: { versionNumber: "desc" },
          take: 1
        }
      }
    });

    return commands
      .filter((command) => command.versions.length > 0)
      .map((command) => ({
        id: command.id,
        name: command.name,
        description: command.description,
        type: command.type,
        options: command.options,
        permissions: command.permissions,
        cooldownSeconds: command.cooldownSeconds,
        version: command.versions[0]
      }));
  }

  @Get("/bots/:id/commands/:commandName")
  async getCommandByName(@Param("id") id: string, @Param("commandName") commandName: string) {
    const normalizedName = String(commandName ?? "").trim().replace(/^\/+/, "");
    const command = await this.prisma.command.findFirst({
      where: {
        botId: id,
        type: { in: RUNNER_COMMAND_TYPES },
        name: { equals: normalizedName, mode: "insensitive" }
      },
      include: {
        versions: {
          where: { status: "published" },
          orderBy: { versionNumber: "desc" },
          take: 1
        }
      }
    });
    if (!command || command.versions.length === 0) return null;
    return {
      commandId: command.id,
      name: command.name,
      description: command.description,
      type: command.type,
      options: command.options,
      permissions: command.permissions,
      cooldownSeconds: command.cooldownSeconds,
      version: command.versions[0]
    };
  }

  @Get("/bots/:id/events")
  async listPublishedEvents(@Param("id") id: string, @Query("eventType") eventType?: string) {
    const where: any = {
      botId: id,
      type: { in: RUNNER_EVENT_COMMAND_TYPES }
    };

    if (eventType) {
      if (!RUNNER_EVENT_TYPES.includes(eventType as any)) return [];
      where.type = `EVENT_${eventType}`;
    }

    const events = await this.prisma.command.findMany({
      where,
      include: {
        versions: {
          where: { status: "published" },
          orderBy: { versionNumber: "desc" },
          take: 1
        }
      }
    });

    return events
      .filter((event) => event.versions.length > 0)
      .map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        type: event.type,
        eventType: event.type.startsWith("EVENT_") ? event.type.slice("EVENT_".length) : null,
        version: event.versions[0]
      }));
  }
}
