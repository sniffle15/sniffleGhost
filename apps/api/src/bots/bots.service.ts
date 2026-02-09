import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { encryptToken } from "../common/encryption";
import { ConfigService } from "@nestjs/config";
import { QueueService } from "../queue/queue.service";
import { LogsService } from "../logs/logs.service";

@Injectable()
export class BotsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private queue: QueueService,
    private logs: LogsService
  ) {}

  private botSelect = {
    id: true,
    ownerId: true,
    name: true,
    description: true,
    prefix: true,
    applicationId: true,
    status: true,
    testGuildId: true,
    lastHeartbeat: true,
    lastError: true,
    createdAt: true,
    updatedAt: true
  };

  private normalizePrefix(prefix?: string) {
    const value = String(prefix ?? "!").trim();
    if (!value) {
      throw new BadRequestException("Prefix cannot be empty");
    }
    if (value.length > 5) {
      throw new BadRequestException("Prefix is too long (max 5 characters)");
    }
    return value;
  }

  private async assertRole(userId: string, botId: string, roles: string[]) {
    const membership = await this.prisma.botMember.findFirst({
      where: { botId, userId }
    });
    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException("Bot access denied");
    }
    return membership;
  }

  async list(userId: string) {
    return this.prisma.bot.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      select: this.botSelect
    });
  }

  async get(userId: string, botId: string) {
    await this.assertRole(userId, botId, ["owner", "editor", "viewer"]);
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: this.botSelect });
    if (!bot) throw new NotFoundException("Bot not found");
    return bot;
  }

  async create(userId: string, input: { name: string; description?: string; applicationId: string; token: string; testGuildId?: string; prefix?: string }) {
    const secret = this.config.get<string>("ENCRYPTION_KEY");
    if (!secret) throw new BadRequestException("ENCRYPTION_KEY missing");
    const encryptedToken = encryptToken(input.token, secret);
    const prefix = this.normalizePrefix(input.prefix);
    const bot = await this.prisma.bot.create({
      data: {
        ownerId: userId,
        name: input.name,
        description: input.description,
        prefix,
        applicationId: input.applicationId,
        encryptedToken,
        testGuildId: input.testGuildId,
        members: {
          create: {
            userId,
            role: "owner"
          }
        }
      },
      select: this.botSelect
    });
    return bot;
  }

  async update(userId: string, botId: string, input: any) {
    await this.assertRole(userId, botId, ["owner", "editor"]);
    const secret = this.config.get<string>("ENCRYPTION_KEY");
    if (input.token && !secret) {
      throw new BadRequestException("ENCRYPTION_KEY missing");
    }
    const tokenPatch = input.token
      ? { encryptedToken: encryptToken(input.token, secret ?? ""), lastError: null }
      : {};
    const prefixPatch = input.prefix !== undefined ? { prefix: this.normalizePrefix(input.prefix) } : {};

    return this.prisma.bot.update({
      where: { id: botId },
      data: {
        name: input.name,
        description: input.description,
        testGuildId: input.testGuildId,
        status: input.status,
        ...prefixPatch,
        ...tokenPatch
      },
      select: this.botSelect
    });
  }

  async start(userId: string, botId: string) {
    await this.assertRole(userId, botId, ["owner", "editor"]);
    await this.prisma.bot.update({ where: { id: botId }, data: { status: "starting" } });
    await this.logs.create(botId, "info", "Bot start requested");
    await this.queue.addStartBot(botId);
    return { success: true };
  }

  async stop(userId: string, botId: string) {
    await this.assertRole(userId, botId, ["owner", "editor"]);
    await this.queue.addStopBot(botId);
    await this.prisma.bot.update({ where: { id: botId }, data: { status: "stopped" } });
    await this.logs.create(botId, "info", "Bot stop requested");
    return { success: true };
  }

  async remove(userId: string, botId: string) {
    await this.assertRole(userId, botId, ["owner"]);

    const existing = await this.prisma.bot.findUnique({
      where: { id: botId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Bot not found");
    }

    // Prevent queued start/sync jobs from bringing the bot back up while deleting.
    await this.queue.removePendingBotJobs(botId);
    await this.queue.addStopBot(botId);

    await this.prisma.$transaction(async (tx) => {
      await tx.persistentVariable.deleteMany({ where: { botId } });
      await tx.botLog.deleteMany({ where: { botId } });
      await tx.commandVersion.deleteMany({ where: { command: { botId } } });
      await tx.command.deleteMany({ where: { botId } });
      await tx.botMember.deleteMany({ where: { botId } });
      await tx.bot.delete({ where: { id: botId } });
    });

    return { success: true };
  }
}
