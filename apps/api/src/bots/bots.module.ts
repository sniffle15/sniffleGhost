import { Module } from "@nestjs/common";
import { BotsService } from "./bots.service";
import { BotsController } from "./bots.controller";
import { PrismaModule } from "../common/prisma.module";
import { QueueModule } from "../queue/queue.module";
import { LogsModule } from "../logs/logs.module";

@Module({
  imports: [PrismaModule, QueueModule, LogsModule],
  providers: [BotsService],
  controllers: [BotsController],
  exports: [BotsService]
})
export class BotsModule {}
