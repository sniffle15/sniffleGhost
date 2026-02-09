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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const zod_pipe_1 = require("../common/zod.pipe");
const shared_1 = require("@botghost/shared");
const jwt_auth_guard_1 = require("../common/jwt-auth.guard");
let AuthController = class AuthController {
    constructor(auth, config) {
        this.auth = auth;
        this.config = config;
    }
    register(body) {
        return this.auth.register(body);
    }
    login(body) {
        return this.auth.login(body);
    }
    refresh(body) {
        return this.auth.refresh(body.refreshToken);
    }
    logout(body) {
        return this.auth.logout(body.refreshToken);
    }
    discordLogin(res) {
        const url = this.auth.getDiscordAuthUrl();
        return res.redirect(url);
    }
    async discordCallback(code, state, res) {
        const result = await this.auth.handleDiscordCallback(code, state);
        const webUrl = this.config.get("WEB_URL");
        if (!webUrl) {
            throw new common_1.InternalServerErrorException("WEB_URL is not configured");
        }
        const params = new URLSearchParams({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken ?? ""
        });
        return res.redirect(`${webUrl}/auth/discord/callback?${params.toString()}`);
    }
    me(req) {
        const user = req.user;
        return this.auth.getProfile(user.id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("/register"),
    (0, common_1.UsePipes)(new zod_pipe_1.ZodValidationPipe(shared_1.RegisterSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)("/login"),
    (0, common_1.UsePipes)(new zod_pipe_1.ZodValidationPipe(shared_1.LoginSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("/refresh"),
    (0, common_1.UsePipes)(new zod_pipe_1.ZodValidationPipe(shared_1.RefreshSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)("/logout"),
    (0, common_1.UsePipes)(new zod_pipe_1.ZodValidationPipe(shared_1.RefreshSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)("/discord/login"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "discordLogin", null);
__decorate([
    (0, common_1.Get)("/discord/callback"),
    __param(0, (0, common_1.Query)("code")),
    __param(1, (0, common_1.Query)("state")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "discordCallback", null);
__decorate([
    (0, common_1.Get)("/me"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("/auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map