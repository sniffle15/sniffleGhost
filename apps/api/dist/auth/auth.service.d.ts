import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/prisma.service";
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    private hashToken;
    private issueTokens;
    register(input: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
        };
    }>;
    login(input: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
        };
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    private signState;
    private verifyState;
    getDiscordAuthUrl(): string;
    handleDiscordCallback(code: string, state: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
            discordName: string | null;
            discordAvatar: string | null;
        };
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string | null;
        name: string | null;
        discordName: string | null;
        discordAvatar: string | null;
    }>;
}
