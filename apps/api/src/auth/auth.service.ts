import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/prisma.service";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async issueTokens(user: { id: string; email?: string | null }) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email ?? undefined });
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET") ?? "refresh";
    const refreshToken = this.jwt.sign({ sub: user.id }, { secret: refreshSecret, expiresIn: "7d" });
    const decoded: any = this.jwt.decode(refreshToken);
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

  async register(input: { email: string; password: string; name?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException("Email already registered");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name }
    });

    const tokens = await this.issueTokens(user);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (!user.passwordHash) throw new UnauthorizedException("Password login not available for this account");

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) throw new UnauthorizedException("Invalid credentials");

    const tokens = await this.issueTokens(user);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET") ?? "refresh";
    try {
      const decoded: any = this.jwt.verify(refreshToken, { secret: refreshSecret });
      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          tokenHash: this.hashToken(refreshToken),
          revokedAt: null
        }
      });
      if (!tokenRecord) throw new UnauthorizedException("Refresh token invalid");

      if (tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException("Refresh token expired");
      }

      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() }
      });

      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) throw new UnauthorizedException("User not found");

      const tokens = await this.issueTokens(user);
      return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
    } catch (error) {
      throw new UnauthorizedException("Refresh token invalid");
    }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { success: true };
  }

  private signState() {
    const secret = this.config.get<string>("JWT_SECRET") ?? "secret";
    return this.jwt.sign({ t: "discord" }, { secret, expiresIn: "10m" });
  }

  private verifyState(state: string) {
    const secret = this.config.get<string>("JWT_SECRET") ?? "secret";
    try {
      const decoded: any = this.jwt.verify(state, { secret });
      return decoded?.t === "discord";
    } catch {
      return false;
    }
  }

  getDiscordAuthUrl() {
    const clientId = this.config.get<string>("DISCORD_CLIENT_ID");
    const redirectUri = this.config.get<string>("DISCORD_REDIRECT_URI");
    if (!clientId || !redirectUri) {
      throw new BadRequestException("Discord OAuth not configured");
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

  async handleDiscordCallback(code: string, state: string) {
    if (!this.verifyState(state)) {
      throw new UnauthorizedException("Invalid OAuth state");
    }
    const clientId = this.config.get<string>("DISCORD_CLIENT_ID");
    const clientSecret = this.config.get<string>("DISCORD_CLIENT_SECRET");
    const redirectUri = this.config.get<string>("DISCORD_REDIRECT_URI");
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException("Discord OAuth not configured");
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
      throw new UnauthorizedException("Discord token exchange failed");
    }
    const tokenJson: any = await tokenRes.json();
    const accessToken = tokenJson?.access_token;
    if (!accessToken) {
      throw new UnauthorizedException("Discord token missing");
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!userRes.ok) {
      throw new UnauthorizedException("Discord user fetch failed");
    }
    const discordUser: any = await userRes.json();
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
    } else {
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

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      discordName: user.discordName,
      discordAvatar: user.discordAvatar
    };
  }
}
