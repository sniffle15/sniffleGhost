import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { BotsModule } from "./bots/bots.module";
import { CommandsModule } from "./commands/commands.module";
import { VersionsModule } from "./versions/versions.module";
import { LogsModule } from "./logs/logs.module";
import { RunnerModule } from "./runner/runner.module";
import { QueueModule } from "./queue/queue.module";
import { PrismaModule } from "./common/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    PrismaModule,
    AuthModule,
    BotsModule,
    CommandsModule,
    VersionsModule,
    LogsModule,
    RunnerModule
  ],
  providers: []
})
export class AppModule {}
