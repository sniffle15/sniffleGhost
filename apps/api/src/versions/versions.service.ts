import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { QueueService } from "../queue/queue.service";
import {
  compileWorkflow,
  executeWorkflow,
  validateWorkflow,
  type ExecutionContext,
  type WorkflowGraph
} from "@botghost/shared";

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  private async assertVersionRole(userId: string, versionId: string, roles: string[]) {
    const version = await this.prisma.commandVersion.findFirst({
      where: { id: versionId },
      include: { command: { include: { bot: { include: { members: true } } } } }
    });
    const membership = version?.command?.bot?.members?.find((member) => member.userId === userId);
    if (!version || !membership || !roles.includes(membership.role)) {
      throw new ForbiddenException("Version not found");
    }
    return version;
  }

  async getVersion(userId: string, versionId: string) {
    return this.assertVersionRole(userId, versionId, ["owner", "editor", "viewer"]);
  }

  async saveWorkflow(userId: string, versionId: string, workflow: WorkflowGraph) {
    await this.assertVersionRole(userId, versionId, ["owner", "editor"]);
    const compiled = compileWorkflow(workflow);
    const workflowJson = JSON.parse(JSON.stringify(workflow)) as Prisma.InputJsonValue;
    const compiledJson = JSON.parse(JSON.stringify(compiled)) as Prisma.InputJsonValue;
    return this.prisma.commandVersion.update({
      where: { id: versionId },
      data: {
        workflowJson,
        compiledAstJson: compiledJson
      }
    });
  }

  async validate(userId: string, versionId: string, workflow: WorkflowGraph) {
    await this.assertVersionRole(userId, versionId, ["owner", "editor", "viewer"]);
    return validateWorkflow(workflow);
  }

  async publish(userId: string, versionId: string) {
    const version = await this.assertVersionRole(userId, versionId, ["owner", "editor"]);
    const compiled = compileWorkflow(version.workflowJson as any);
    const compiledJson = JSON.parse(JSON.stringify(compiled)) as Prisma.InputJsonValue;

    await this.prisma.commandVersion.updateMany({
      where: { commandId: version.commandId, status: "published" },
      data: { status: "draft" }
    });

    const updated = await this.prisma.commandVersion.update({
      where: { id: versionId },
      data: { status: "published", compiledAstJson: compiledJson }
    });

    await this.queue.addSyncCommands(version.command.botId);
    return updated;
  }

  async testRun(userId: string, versionId: string, input: any) {
    const version = await this.assertVersionRole(userId, versionId, ["owner", "editor", "viewer"]);
    const workflow = version.compiledAstJson as any;
    if (!workflow) {
      throw new BadRequestException("Workflow not compiled yet");
    }

    const actions: any[] = [];

    const handlers = {
      reply: async (content: string) => {
        actions.push({ type: "reply", content });
        return null;
      },
      sendChannel: async (channelId: string, content: string) => {
        actions.push({ type: "channel", channelId, content });
        return null;
      },
      sendDm: async (content: string, options?: { targetUserId?: string }) => {
        actions.push({ type: "dm", content, targetUserId: options?.targetUserId ?? null });
        return null;
      },
      sendEmbed: async (embed: any) => {
        actions.push({ type: "embed", embed });
        return null;
      },
      addRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
        actions.push({
          type: "addRole",
          roleId,
          reason: options?.reason ?? null,
          targetUserId: options?.targetUserId ?? null
        });
      },
      removeRole: async (roleId: string, options?: { reason?: string; targetUserId?: string }) => {
        actions.push({
          type: "removeRole",
          roleId,
          reason: options?.reason ?? null,
          targetUserId: options?.targetUserId ?? null
        });
      },
      log: async (level: string, message: string) => {
        actions.push({ type: "log", level, message });
      },
      httpRequest: async () => ({ status: 200, body: { ok: true } })
    };

    const variableStore = {
      async get() {
        return null;
      },
      async set() {}
    };

    const context: ExecutionContext = {
      botId: version.command.botId,
      commandName: version.command.name,
      user: {
        id: input?.user?.id ?? "test-user",
        username: input?.user?.username ?? "Tester"
      },
      guild: input?.guild ?? { id: "test-guild", name: "Test Guild", iconUrl: "" },
      channel: input?.channel ?? { id: "test-channel", name: "test-channel" },
      options: input?.options ?? {},
      memberRoles: input?.memberRoles ?? [],
      variables: {}
    };

    const result = await executeWorkflow(workflow, context, handlers, variableStore, {
      maxDurationMs: 2000,
      maxNodes: 200
    });

    return { actions, events: result.events, error: result.error };
  }
}
