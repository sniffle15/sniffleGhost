"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const bots_module_1 = require("./bots/bots.module");
const commands_module_1 = require("./commands/commands.module");
const versions_module_1 = require("./versions/versions.module");
const logs_module_1 = require("./logs/logs.module");
const runner_module_1 = require("./runner/runner.module");
const queue_module_1 = require("./queue/queue.module");
const prisma_module_1 = require("./common/prisma.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            queue_module_1.QueueModule,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            bots_module_1.BotsModule,
            commands_module_1.CommandsModule,
            versions_module_1.VersionsModule,
            logs_module_1.LogsModule,
            runner_module_1.RunnerModule
        ],
        providers: []
    })
], AppModule);
//# sourceMappingURL=app.module.js.map