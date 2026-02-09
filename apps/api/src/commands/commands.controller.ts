import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CommandsService } from "./commands.service";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CurrentUser } from "../common/user.decorator";
import { ZodValidationPipe } from "../common/zod.pipe";
import {
  CommandCreateSchema,
  CommandUpdateSchema,
  CommandVersionCreateSchema,
  EventCreateSchema,
  EventUpdateSchema
} from "@botghost/shared";

@Controller()
@UseGuards(JwtAuthGuard)
export class CommandsController {
  constructor(private commands: CommandsService) {}

  @Get("/bots/:id/commands")
  list(@CurrentUser() user: any, @Param("id") botId: string) {
    return this.commands.list(user.id, botId);
  }

  @Post("/bots/:id/commands")
  create(
    @CurrentUser() user: any,
    @Param("id") botId: string,
    @Body(new ZodValidationPipe(CommandCreateSchema)) body: any
  ) {
    return this.commands.create(user.id, botId, body);
  }

  @Get("/commands/:id")
  get(@CurrentUser() user: any, @Param("id") id: string) {
    return this.commands.get(user.id, id);
  }

  @Patch("/commands/:id")
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CommandUpdateSchema)) body: any
  ) {
    return this.commands.update(user.id, id, body);
  }

  @Delete("/commands/:id")
  delete(@CurrentUser() user: any, @Param("id") id: string) {
    return this.commands.delete(user.id, id);
  }

  @Get("/commands/:id/versions")
  listVersions(@CurrentUser() user: any, @Param("id") id: string) {
    return this.commands.listVersions(user.id, id);
  }

  @Post("/commands/:id/versions")
  createVersion(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CommandVersionCreateSchema)) body: any
  ) {
    return this.commands.createVersion(user.id, id, body.notes);
  }

  @Get("/bots/:id/events")
  listEvents(@CurrentUser() user: any, @Param("id") botId: string) {
    return this.commands.listEvents(user.id, botId);
  }

  @Post("/bots/:id/events")
  createEvent(
    @CurrentUser() user: any,
    @Param("id") botId: string,
    @Body(new ZodValidationPipe(EventCreateSchema)) body: any
  ) {
    return this.commands.createEvent(user.id, botId, body);
  }

  @Get("/events/:id")
  getEvent(@CurrentUser() user: any, @Param("id") id: string) {
    return this.commands.getEvent(user.id, id);
  }

  @Patch("/events/:id")
  updateEvent(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(EventUpdateSchema)) body: any
  ) {
    return this.commands.updateEvent(user.id, id, body);
  }

  @Delete("/events/:id")
  deleteEvent(@CurrentUser() user: any, @Param("id") id: string) {
    return this.commands.deleteEvent(user.id, id);
  }

  @Get("/events/:id/versions")
  listEventVersions(@CurrentUser() user: any, @Param("id") id: string) {
    return this.commands.listEventVersions(user.id, id);
  }

  @Post("/events/:id/versions")
  createEventVersion(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CommandVersionCreateSchema)) body: any
  ) {
    return this.commands.createEventVersion(user.id, id, body.notes);
  }
}
