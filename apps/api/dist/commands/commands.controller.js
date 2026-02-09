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
exports.CommandsController = void 0;
const common_1 = require("@nestjs/common");
const commands_service_1 = require("./commands.service");
const jwt_auth_guard_1 = require("../common/jwt-auth.guard");
const user_decorator_1 = require("../common/user.decorator");
const zod_pipe_1 = require("../common/zod.pipe");
const shared_1 = require("@botghost/shared");
let CommandsController = class CommandsController {
    constructor(commands) {
        this.commands = commands;
    }
    list(user, botId) {
        return this.commands.list(user.id, botId);
    }
    create(user, botId, body) {
        return this.commands.create(user.id, botId, body);
    }
    get(user, id) {
        return this.commands.get(user.id, id);
    }
    update(user, id, body) {
        return this.commands.update(user.id, id, body);
    }
    delete(user, id) {
        return this.commands.delete(user.id, id);
    }
    listVersions(user, id) {
        return this.commands.listVersions(user.id, id);
    }
    createVersion(user, id, body) {
        return this.commands.createVersion(user.id, id, body.notes);
    }
    listEvents(user, botId) {
        return this.commands.listEvents(user.id, botId);
    }
    createEvent(user, botId, body) {
        return this.commands.createEvent(user.id, botId, body);
    }
    getEvent(user, id) {
        return this.commands.getEvent(user.id, id);
    }
    updateEvent(user, id, body) {
        return this.commands.updateEvent(user.id, id, body);
    }
    deleteEvent(user, id) {
        return this.commands.deleteEvent(user.id, id);
    }
    listEventVersions(user, id) {
        return this.commands.listEventVersions(user.id, id);
    }
    createEventVersion(user, id, body) {
        return this.commands.createEventVersion(user.id, id, body.notes);
    }
};
exports.CommandsController = CommandsController;
__decorate([
    (0, common_1.Get)("/bots/:id/commands"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("/bots/:id/commands"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(shared_1.CommandCreateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("/commands/:id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)("/commands/:id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(shared_1.CommandUpdateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)("/commands/:id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)("/commands/:id/versions"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "listVersions", null);
__decorate([
    (0, common_1.Post)("/commands/:id/versions"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(shared_1.CommandVersionCreateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "createVersion", null);
__decorate([
    (0, common_1.Get)("/bots/:id/events"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Post)("/bots/:id/events"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(shared_1.EventCreateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Get)("/events/:id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "getEvent", null);
__decorate([
    (0, common_1.Patch)("/events/:id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(shared_1.EventUpdateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "updateEvent", null);
__decorate([
    (0, common_1.Delete)("/events/:id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "deleteEvent", null);
__decorate([
    (0, common_1.Get)("/events/:id/versions"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "listEventVersions", null);
__decorate([
    (0, common_1.Post)("/events/:id/versions"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(shared_1.CommandVersionCreateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommandsController.prototype, "createEventVersion", null);
exports.CommandsController = CommandsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [commands_service_1.CommandsService])
], CommandsController);
//# sourceMappingURL=commands.controller.js.map