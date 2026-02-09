import { Module } from "@nestjs/common";
import { VersionsService } from "./versions.service";
import { VersionsController } from "./versions.controller";
import { PrismaModule } from "../common/prisma.module";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [VersionsService],
  controllers: [VersionsController]
})
export class VersionsModule {}
