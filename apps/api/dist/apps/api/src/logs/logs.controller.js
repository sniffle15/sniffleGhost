"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/jwt-auth.guard");
const sse_auth_guard_1 = require("../common/sse-auth.guard");
const user_decorator_1 = require("../common/user.decorator");
const logs_service_1 = require("./logs.service");
const rxjs_1 = require("rxjs");
let LogsController = class LogsController {
    constructor(logs) {
        this.logs = logs;
    }
    async list(user, id, limit) {
        await this.logs.ensureAccess(user.id, id);
        return this.logs.list(id, limit ? Number(limit) : 200);
    }
    async stream(user, id) {
        await this.logs.ensureAccess(user.id, id);
        return this.logs.logStream().pipe((0, rxjs_1.filter)((event) => event.botId === id), (0, rxjs_1.map)((event) => ({ data: event })));
    }
};
exports.LogsController = LogsController;
__decorate([
    (0, common_1.Get)("/bots/:id/logs"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LogsController.prototype, "list", null);
__decorate([
    (0, common_1.Sse)("/bots/:id/log-stream"),
    (0, common_1.UseGuards)(sse_auth_guard_1.SseAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LogsController.prototype, "stream", null);
exports.LogsController = LogsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [logs_service_1.LogsService])
], LogsController);
//# sourceMappingURL=logs.controller.js.map