import { Module } from "@nestjs/common";
import { RunnerController } from "./runner.controller";
import { PrismaModule } from "../common/prisma.module";
import { LogsModule } from "../logs/logs.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, LogsModule, ConfigModule],
  controllers: [RunnerController]
})
export class RunnerModule {}
