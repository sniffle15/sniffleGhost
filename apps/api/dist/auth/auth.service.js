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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../common/prisma.service");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    async issueTokens(user) {
        const accessToken = this.jwt.sign({ sub: user.id, email: user.email ?? undefined });
        const refreshSecret = this.config.get("JWT_REFRESH_SECRET") ?? "refresh";
        const refreshToken = this.jwt.sign({ sub: user.id }, { secret: refreshSecret, expiresIn: "7d" });
        const decoded = this.jwt.decode(refreshToken);
        const expiresAt = new Date(decoded?.exp * 1000);
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: this.hashToken(refreshToken),
                expiresAt
            }
        });
        return { accessToken, refreshToken };
    }
    async register(input) {
        const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
        if (existing)
            throw new common_1.BadRequestException("Email already registered");
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await this.prisma.user.create({
            data: { email: input.email, passwordHash, name: input.name }
        });
        const tokens = await this.issueTokens(user);
        return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
    }
    async login(input) {
        const user = await this.prisma.user.findUnique({ where: { email: input.email } });
        if (!user)
            throw new common_1.UnauthorizedException("Invalid credentials");
        if (!user.passwordHash)
            throw new common_1.UnauthorizedException("Password login not available for this account");
        const match = await bcryptjs_1.default.compare(input.password, user.passwordHash);
        if (!match)
            throw new common_1.UnauthorizedException("Invalid credentials");
        const tokens = await this.issueTokens(user);
        return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
    }
    async refresh(refreshToken) {
        const refreshSecret = this.config.get("JWT_REFRESH_SECRET") ?? "refresh";
        try {
            const decoded = this.jwt.verify(refreshToken, { secret: refreshSecret });
            const tokenRecord = await this.prisma.refreshToken.findFirst({
                where: {
                    tokenHash: this.hashToken(refreshToken),
                    revokedAt: null
                }
            });
            if (!tokenRecord)
                throw new common_1.UnauthorizedException("Refresh token invalid");
            if (tokenRecord.expiresAt < new Date()) {
                throw new common_1.UnauthorizedException("Refresh token expired");
            }
            await this.prisma.refreshToken.update({
                where: { id: tokenRecord.id },
                data: { revokedAt: new Date() }
            });
            const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
            if (!user)
                throw new common_1.UnauthorizedException("User not found");
            const tokens = await this.issueTokens(user);
            return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
        }
        catch (error) {
            throw new common_1.UnauthorizedException("Refresh token invalid");
        }
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
            data: { revokedAt: new Date() }
        });
        return { success: true };
    }
    signState() {
        const secret = this.config.get("JWT_SECRET") ?? "secret";
        return this.jwt.sign({ t: "discord" }, { secret, expiresIn: "10m" });
    }
    verifyState(state) {
        const secret = this.config.get("JWT_SECRET") ?? "secret";
        try {
            const decoded = this.jwt.verify(state, { secret });
            return decoded?.t === "discord";
        }
        catch {
            return false;
        }
    }
    getDiscordAuthUrl() {
        const clientId = this.config.get("DISCORD_CLIENT_ID");
        const redirectUri = this.config.get("DISCORD_REDIRECT_URI");
        if (!clientId || !redirectUri) {
            throw new common_1.BadRequestException("Discord OAuth not configured");
        }
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "identify email",
            state: this.signState()
        });
        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }
    async handleDiscordCallback(code, state) {
        if (!this.verifyState(state)) {
            throw new common_1.UnauthorizedException("Invalid OAuth state");
        }
        const clientId = this.config.get("DISCORD_CLIENT_ID");
        const clientSecret = this.config.get("DISCORD_CLIENT_SECRET");
        const redirectUri = this.config.get("DISCORD_REDIRECT_URI");
        if (!clientId || !clientSecret || !redirectUri) {
            throw new common_1.BadRequestException("Discord OAuth not configured");
        }
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri
            })
        });
        if (!tokenRes.ok) {
            throw new common_1.UnauthorizedException("Discord token exchange failed");
        }
        const tokenJson = await tokenRes.json();
        const accessToken = tokenJson?.access_token;
        if (!accessToken) {
            throw new common_1.UnauthorizedException("Discord token missing");
        }
        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!userRes.ok) {
            throw new common_1.UnauthorizedException("Discord user fetch failed");
        }
        const discordUser = await userRes.json();
        const discordId = String(discordUser.id);
        const discordName = discordUser.global_name || discordUser.username;
        const discordAvatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${Number(discordUser.discriminator ?? 0) % 5}.png`;
        const email = discordUser.email ?? null;
        let user = await this.prisma.user.findUnique({ where: { discordId } });
        if (!user && email) {
            user = await this.prisma.user.findUnique({ where: { email } });
        }
        if (user) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    email: email ?? user.email,
                    name: discordName ?? user.name,
                    discordId,
                    discordName,
                    discordAvatar
                }
            });
        }
        else {
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: discordName,
                    discordId,
                    discordName,
                    discordAvatar
                }
            });
        }
        const tokens = await this.issueTokens(user);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                discordName: user.discordName,
                discordAvatar: user.discordAvatar
            },
            ...tokens
        };
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException("User not found");
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            discordName: user.discordName,
            discordAvatar: user.discordAvatar
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map