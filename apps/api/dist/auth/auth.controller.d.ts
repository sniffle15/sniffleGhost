import { ConfigService } from "@nestjs/config";
import type { Response, Request } from "express";
import { AuthService } from "./auth.service";
export declare class AuthController {
    private auth;
    private config;
    constructor(auth: AuthService, config: ConfigService);
    register(body: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
        };
    }>;
    login(body: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
        };
    }>;
    refresh(body: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string | null;
            name: string | null;
        };
    }>;
    logout(body: any): Promise<{
        success: boolean;
    }>;
    discordLogin(res: Response): void;
    discordCallback(code: string, state: string, res: Response): Promise<void>;
    me(req: Request): Promise<{
        id: string;
        email: string | null;
        name: string | null;
        discordName: string | null;
        discordAvatar: string | null;
    }>;
}
