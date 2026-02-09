import "reflect-metadata";
import path from "node:path";
import dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

// Load api-local env first, then optional repo-root .env as fallback.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false });

function parseCorsOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS ?? process.env.WEB_URL);
  const app = await NestFactory.create(AppModule, {
    cors: corsOrigins.length > 0 ? { origin: corsOrigins, credentials: true } : true
  });

  const config = new DocumentBuilder()
    .setTitle("sniffleGhost API")
    .setDescription("API for bot hosting and command builder")
    .setVersion("0.1")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/docs", app, document);

  const port = Number(process.env.PORT ?? "4000");
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen(port, host);

  const publicUrl = process.env.API_PUBLIC_URL ?? `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
  console.log(`API listening on ${publicUrl}`);
}

bootstrap();
