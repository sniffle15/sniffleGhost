import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RunnerGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers["x-runner-secret"] as string | undefined;
    const expected = this.config.get<string>("RUNNER_SECRET") ?? "runner-secret";
    if (!secret || secret !== expected) {
      throw new UnauthorizedException("Runner secret invalid");
    }
    return true;
  }
}
