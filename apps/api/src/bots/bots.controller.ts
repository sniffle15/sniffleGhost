import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { BotsService } from "./bots.service";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CurrentUser } from "../common/user.decorator";
import { ZodValidationPipe } from "../common/zod.pipe";
import { BotCreateSchema, BotUpdateSchema } from "@botghost/shared";

@Controller("/bots")
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private bots: BotsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.bots.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(BotCreateSchema)) body: any
  ) {
    return this.bots.create(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: any, @Param("id") id: string) {
    return this.bots.get(user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(BotUpdateSchema)) body: any
  ) {
    return this.bots.update(user.id, id, body);
  }

  @Post(":id/start")
  start(@CurrentUser() user: any, @Param("id") id: string) {
    return this.bots.start(user.id, id);
  }

  @Post(":id/stop")
  stop(@CurrentUser() user: any, @Param("id") id: string) {
    return this.bots.stop(user.id, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.bots.remove(user.id, id);
  }
}
