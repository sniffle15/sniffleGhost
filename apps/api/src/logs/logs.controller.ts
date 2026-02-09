import { Controller, Get, Param, Query, Sse, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { SseAuthGuard } from "../common/sse-auth.guard";
import { CurrentUser } from "../common/user.decorator";
import { LogsService } from "./logs.service";
import { filter, map } from "rxjs";

@Controller()
export class LogsController {
  constructor(private logs: LogsService) {}

  @Get("/bots/:id/logs")
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: any, @Param("id") id: string, @Query("limit") limit?: string) {
    await this.logs.ensureAccess(user.id, id);
    return this.logs.list(id, limit ? Number(limit) : 200);
  }

  @Sse("/bots/:id/log-stream")
  @UseGuards(SseAuthGuard)
  async stream(@CurrentUser() user: any, @Param("id") id: string) {
    await this.logs.ensureAccess(user.id, id);
    return this.logs.logStream().pipe(
      filter((event) => event.botId === id),
      map((event) => ({ data: event }))
    );
  }
}
