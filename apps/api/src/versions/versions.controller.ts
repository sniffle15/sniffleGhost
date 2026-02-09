import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { VersionsService } from "./versions.service";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CurrentUser } from "../common/user.decorator";
import { ZodValidationPipe } from "../common/zod.pipe";
import { WorkflowGraphSchema } from "@botghost/shared";

@Controller("/versions")
@UseGuards(JwtAuthGuard)
export class VersionsController {
  constructor(private versions: VersionsService) {}

  @Get(":id")
  get(@CurrentUser() user: any, @Param("id") id: string) {
    return this.versions.getVersion(user.id, id);
  }

  @Patch(":id")
  save(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(WorkflowGraphSchema)) body: any
  ) {
    return this.versions.saveWorkflow(user.id, id, body);
  }

  @Post(":id/validate")
  validate(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(WorkflowGraphSchema)) body: any
  ) {
    return this.versions.validate(user.id, id, body);
  }

  @Post(":id/publish")
  publish(@CurrentUser() user: any, @Param("id") id: string) {
    return this.versions.publish(user.id, id);
  }

  @Post(":id/test-run")
  testRun(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.versions.testRun(user.id, id, body);
  }
}
