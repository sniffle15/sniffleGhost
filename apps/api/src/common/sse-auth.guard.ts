import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.split(" ")?.[1] ?? (request.query?.token as string | undefined);
    if (!token) throw new UnauthorizedException("Missing token");
    try {
      const payload = this.jwt.verify(token, { secret: this.config.get<string>("JWT_SECRET") });
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
