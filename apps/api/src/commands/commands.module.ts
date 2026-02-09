import { Module } from "@nestjs/common";
import { CommandsService } from "./commands.service";
import { CommandsController } from "./commands.controller";
import { PrismaModule } from "../common/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [CommandsService],
  controllers: [CommandsController],
  exports: [CommandsService]
})
export class CommandsModule {}
