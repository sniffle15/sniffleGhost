import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { EventTypeSchema, WORKFLOW_SCHEMA_VERSION } from "@botghost/shared";

const COMMAND_TYPES = new Set(["SLASH", "PREFIX"]);
const EVENT_TYPES = EventTypeSchema.options;
const EVENT_COMMAND_TYPES = new Set(EVENT_TYPES.map((eventType) => `EVENT_${eventType}`));

@Injectable()
export class CommandsService {
  constructor(private prisma: PrismaService) {}

  private commandTypeToEventType(commandType: string): string | null {
    if (!commandType.startsWith("EVENT_")) return null;
    const eventType = commandType.slice("EVENT_".length);
    return EVENT_TYPES.includes(eventType as any) ? eventType : null;
  }

  private assertCommandType(type: string) {
    if (!COMMAND_TYPES.has(type)) {
      throw new BadRequestException("Unsupported command type");
    }
  }

  private normalizeCommandName(name: string, type: string) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) {
      throw new BadRequestException("Command name is required");
    }

    if (type === "PREFIX") {
      return trimmed.replace(/^\/+/, "");
    }
    return trimmed.replace(/^\/+/, "");
  }

  private mapEventTypeToCommandType(eventType: string): string {
    if (!EVENT_TYPES.includes(eventType as any)) {
      throw new BadRequestException("Unsupported event type");
    }
    return `EVENT_${eventType}`;
  }

  private toEventDto(command: any) {
    return {
      ...command,
      eventType: this.commandTypeToEventType(command.type)
    };
  }

  private async assertBotRole(userId: string, botId: string, roles: string[]) {
    const membership = await this.prisma.botMember.findFirst({ where: { botId, userId } });
    if (!membership || !roles.includes(membership.role)) throw new ForbiddenException("Bot access denied");
    return membership;
  }

  private async assertCommandRole(userId: string, commandId: string, roles: string[]) {
    const command = await this.prisma.command.findFirst({
      where: { id: commandId },
      include: { bot: { include: { members: true } } }
    });
    const membership = command?.bot?.members?.find((member) => member.userId === userId);
    if (!command || !membership || !roles.includes(membership.role)) throw new ForbiddenException("Command not found");
    return command;
  }

  private createBaseWorkflow(input: { commandName?: string; eventType?: string }) {
    const triggerNode = input.eventType
      ? {
          id: "trigger",
          type: "MessageCreateTrigger",
          position: { x: 0, y: 0 },
          data: { eventType: input.eventType }
        }
      : {
          id: "trigger",
          type: "SlashCommandTrigger",
          position: { x: 0, y: 0 },
          data: { commandName: input.commandName ?? "command" }
        };

    return {
      version: WORKFLOW_SCHEMA_VERSION,
      nodes: [
        triggerNode,
        {
          id: "stop",
          type: "Stop",
          position: { x: 0, y: 160 },
          data: {}
        }
      ],
      edges: [{ id: "e1", source: "trigger", target: "stop" }]
    };
  }

  async list(userId: string, botId: string) {
    await this.assertBotRole(userId, botId, ["owner", "editor", "viewer"]);
    return this.prisma.command.findMany({
      where: { botId, type: { in: [...COMMAND_TYPES] } },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(userId: string, botId: string, input: any) {
    this.assertCommandType(input.type);
    await this.assertBotRole(userId, botId, ["owner", "editor"]);
    const normalizedName = this.normalizeCommandName(input.name, input.type);
    const command = await this.prisma.command.create({
      data: {
        botId,
        name: normalizedName,
        description: input.description,
        type: input.type,
        options: input.options ?? [],
        permissions: input.permissions ?? { adminOnly: false, roleAllowlist: [], channelAllowlist: [] },
        cooldownSeconds: input.cooldownSeconds ?? 0
      }
    });

    await this.prisma.commandVersion.create({
      data: {
        commandId: command.id,
        versionNumber: 1,
        status: "draft",
        workflowJson: this.createBaseWorkflow({ commandName: command.name })
      }
    });

    return command;
  }

  async get(userId: string, commandId: string) {
    const command = await this.assertCommandRole(userId, commandId, ["owner", "editor", "viewer"]);
    if (!COMMAND_TYPES.has(command.type)) throw new ForbiddenException("Command not found");
    return command;
  }

  async update(userId: string, commandId: string, input: any) {
    const existing = await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
    if (input.type) this.assertCommandType(input.type);
    const effectiveType = input.type ?? existing.type;
    const normalizedName = input.name !== undefined ? this.normalizeCommandName(input.name, effectiveType) : undefined;
    return this.prisma.command.update({
      where: { id: commandId },
      data: {
        name: normalizedName,
        description: input.description,
        type: input.type,
        options: input.options,
        permissions: input.permissions,
        cooldownSeconds: input.cooldownSeconds
      }
    });
  }

  async delete(userId: string, commandId: string) {
    const command = await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
    if (!COMMAND_TYPES.has(command.type)) throw new ForbiddenException("Command not found");

    await this.prisma.$transaction([
      this.prisma.commandVersion.deleteMany({ where: { commandId } }),
      this.prisma.command.delete({ where: { id: commandId } })
    ]);

    return { success: true };
  }

  async listVersions(userId: string, commandId: string) {
    await this.assertCommandRole(userId, commandId, ["owner", "editor", "viewer"]);
    return this.prisma.commandVersion.findMany({
      where: { commandId },
      orderBy: { versionNumber: "desc" }
    });
  }

  async createVersion(userId: string, commandId: string, notes?: string) {
    const command = await this.assertCommandRole(userId, commandId, ["owner", "editor"]);
    if (!COMMAND_TYPES.has(command.type)) throw new ForbiddenException("Command not found");

    const latest = await this.prisma.commandVersion.findFirst({
      where: { commandId },
      orderBy: { versionNumber: "desc" }
    });

    const nextVersion = (latest?.versionNumber ?? 0) + 1;
    const workflowJson = latest?.workflowJson ?? this.createBaseWorkflow({ commandName: command.name });

    return this.prisma.commandVersion.create({
      data: {
        commandId,
        versionNumber: nextVersion,
        status: "draft",
        notes,
        workflowJson
      }
    });
  }

  async listEvents(userId: string, botId: string) {
    await this.assertBotRole(userId, botId, ["owner", "editor", "viewer"]);
    const events = await this.prisma.command.findMany({
      where: { botId, type: { in: [...EVENT_COMMAND_TYPES] } },
      orderBy: { createdAt: "desc" }
    });
    return events.map((event) => this.toEventDto(event));
  }

  async createEvent(userId: string, botId: string, input: any) {
    await this.assertBotRole(userId, botId, ["owner", "editor"]);
    const mappedType = this.mapEventTypeToCommandType(input.eventType);

    const event = await this.prisma.command.create({
      data: {
        botId,
        name: input.name,
        description: input.description,
        type: mappedType,
        options: [],
        permissions: { adminOnly: false, roleAllowlist: [], channelAllowlist: [] },
        cooldownSeconds: 0
      }
    });

    await this.prisma.commandVersion.create({
      data: {
        commandId: event.id,
        versionNumber: 1,
        status: "draft",
        workflowJson: this.createBaseWorkflow({ eventType: input.eventType })
      }
    });

    return this.toEventDto(event);
  }

  async getEvent(userId: string, eventId: string) {
    const event = await this.assertCommandRole(userId, eventId, ["owner", "editor", "viewer"]);
    if (!EVENT_COMMAND_TYPES.has(event.type)) throw new ForbiddenException("Event not found");
    return this.toEventDto(event);
  }

  async updateEvent(userId: string, eventId: string, input: any) {
    await this.assertCommandRole(userId, eventId, ["owner", "editor"]);

    const data: any = {
      name: input.name,
      description: input.description
    };

    if (input.eventType) {
      data.type = this.mapEventTypeToCommandType(input.eventType);
    }

    const updated = await this.prisma.command.update({
      where: { id: eventId },
      data
    });

    return this.toEventDto(updated);
  }

  async deleteEvent(userId: string, eventId: string) {
    const event = await this.assertCommandRole(userId, eventId, ["owner", "editor"]);
    if (!EVENT_COMMAND_TYPES.has(event.type)) throw new ForbiddenException("Event not found");

    await this.prisma.$transaction([
      this.prisma.commandVersion.deleteMany({ where: { commandId: eventId } }),
      this.prisma.command.delete({ where: { id: eventId } })
    ]);

    return { success: true };
  }

  async listEventVersions(userId: string, eventId: string) {
    await this.getEvent(userId, eventId);
    return this.prisma.commandVersion.findMany({
      where: { commandId: eventId },
      orderBy: { versionNumber: "desc" }
    });
  }

  async createEventVersion(userId: string, eventId: string, notes?: string) {
    const event = await this.assertCommandRole(userId, eventId, ["owner", "editor"]);
    if (!EVENT_COMMAND_TYPES.has(event.type)) throw new ForbiddenException("Event not found");

    const eventType = this.commandTypeToEventType(event.type);
    if (!eventType) throw new BadRequestException("Unsupported event type");

    const latest = await this.prisma.commandVersion.findFirst({
      where: { commandId: eventId },
      orderBy: { versionNumber: "desc" }
    });

    const nextVersion = (latest?.versionNumber ?? 0) + 1;
    const workflowJson = latest?.workflowJson ?? this.createBaseWorkflow({ eventType });

    return this.prisma.commandVersion.create({
      data: {
        commandId: eventId,
        versionNumber: nextVersion,
        status: "draft",
        notes,
        workflowJson
      }
    });
  }
}
