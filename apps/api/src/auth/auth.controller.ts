import { Body, Controller, Get, Post, Query, Res, UseGuards, UsePipes, Req } from "@nestjs/common";
import type { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { LoginSchema, RegisterSchema, RefreshSchema } from "@botghost/shared";
import { JwtAuthGuard } from "../common/jwt-auth.guard";

@Controller("/auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("/register")
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  register(@Body() body: any) {
    return this.auth.register(body);
  }

  @Post("/login")
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(@Body() body: any) {
    return this.auth.login(body);
  }

  @Post("/refresh")
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  refresh(@Body() body: any) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post("/logout")
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  logout(@Body() body: any) {
    return this.auth.logout(body.refreshToken);
  }

  @Get("/discord/login")
  discordLogin(@Res() res: Response) {
    const url = this.auth.getDiscordAuthUrl();
    return res.redirect(url);
  }

  @Get("/discord/callback")
  async discordCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    const result = await this.auth.handleDiscordCallback(code, state);
    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? ""
    });
    return res.redirect(`${webUrl}/auth/discord/callback?${params.toString()}`);
  }

  @Get("/me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    const user: any = (req as any).user;
    return this.auth.getProfile(user.id);
  }
}
