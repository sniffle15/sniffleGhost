import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { Subject } from "rxjs";

export interface BotLogEvent {
  id: string;
  botId: string;
  level: string;
  message: string;
  ts: Date;
  meta?: any;
}

@Injectable()
export class LogsService {
  private logSubject = new Subject<BotLogEvent>();

  constructor(private prisma: PrismaService) {}

  logStream() {
    return this.logSubject.asObservable();
  }

  async ensureAccess(userId: string, botId: string) {
    const membership = await this.prisma.botMember.findFirst({ where: { botId, userId } });
    if (!membership) throw new ForbiddenException("Bot not found");
  }

  async list(botId: string, limit = 200) {
    return this.prisma.botLog.findMany({
      where: { botId },
      orderBy: { ts: "desc" },
      take: limit
    });
  }

  async create(botId: string, level: string, message: string, meta?: any) {
    const log = await this.prisma.botLog.create({
      data: {
        botId,
        level,
        message,
        meta
      }
    });
    this.logSubject.next({
      id: log.id,
      botId: log.botId,
      level: log.level,
      message: log.message,
      ts: log.ts,
      meta: log.meta
    });
    return log;
  }
}
