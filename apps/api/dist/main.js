"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), ".env") });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), "../../.env"), override: false });
function parseCorsOrigins(raw) {
    if (!raw)
        return [];
    return raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}
async function bootstrap() {
    const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS ?? process.env.WEB_URL);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: corsOrigins.length > 0 ? { origin: corsOrigins, credentials: true } : true
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle("sniffleGhost API")
        .setDescription("API for bot hosting and command builder")
        .setVersion("0.1")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("/docs", app, document);
    const port = Number(process.env.PORT ?? "4000");
    const host = process.env.HOST ?? "0.0.0.0";
    await app.listen(port, host);
    const publicUrl = process.env.API_PUBLIC_URL ?? `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
    console.log(`API listening on ${publicUrl}`);
}
bootstrap();
//# sourceMappingURL=main.js.map