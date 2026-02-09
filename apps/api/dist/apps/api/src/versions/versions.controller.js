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
exports.VersionsController = void 0;
const common_1 = require("@nestjs/common");
const versions_service_1 = require("./versions.service");
const jwt_auth_guard_1 = require("../common/jwt-auth.guard");
const user_decorator_1 = require("../common/user.decorator");
const zod_pipe_1 = require("../common/zod.pipe");
const shared_1 = require("@botghost/shared");
let VersionsController = class VersionsController {
    constructor(versions) {
        this.versions = versions;
    }
    get(user, id) {
        return this.versions.getVersion(user.id, id);
    }
    save(user, id, body) {
        return this.versions.saveWorkflow(user.id, id, body);
    }
    validate(user, id, body) {
        return this.versions.validate(user.id, id, body);
    }
    publish(user, id) {
        return this.versions.publish(user.id, id);
    }
    testRun(user, id, body) {
        return this.versions.testRun(user.id, id, body);
    }
};
exports.VersionsController = VersionsController;
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VersionsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UsePipes)(new zod_pipe_1.ZodValidationPipe(shared_1.WorkflowGraphSchema)),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], VersionsController.prototype, "save", null);
__decorate([
    (0, common_1.Post)(":id/validate"),
    (0, common_1.UsePipes)(new zod_pipe_1.ZodValidationPipe(shared_1.WorkflowGraphSchema)),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], VersionsController.prototype, "validate", null);
__decorate([
    (0, common_1.Post)(":id/publish"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VersionsController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(":id/test-run"),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], VersionsController.prototype, "testRun", null);
exports.VersionsController = VersionsController = __decorate([
    (0, common_1.Controller)("/versions"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [versions_service_1.VersionsService])
], VersionsController);
//# sourceMappingURL=versions.controller.js.map