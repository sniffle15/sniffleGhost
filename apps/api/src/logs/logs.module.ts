import { Module } from "@nestjs/common";
import { LogsService } from "./logs.service";
import { LogsController } from "./logs.controller";
import { PrismaModule } from "../common/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SseAuthGuard } from "../common/sse-auth.guard";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET")
      })
    })
  ],
  providers: [LogsService, SseAuthGuard],
  controllers: [LogsController],
  exports: [LogsService]
})
export class LogsModule {}
