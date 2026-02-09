"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const encryption_1 = require("../src/common/encryption");
const shared_1 = require("@botghost/shared");
const prisma = new client_1.PrismaClient();
async function main() {
    const email = "demo@local.dev";
    const password = "password123";
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        user = await prisma.user.create({ data: { email, passwordHash, name: "Demo User" } });
    }
    const existingBot = await prisma.bot.findFirst({ where: { ownerId: user.id } });
    if (existingBot) {
        console.log("Demo data already exists");
        return;
    }
    const encryptionKey = process.env.ENCRYPTION_KEY ?? "dev-encryption-key";
    const encryptedToken = (0, encryption_1.encryptToken)("PASTE_DISCORD_BOT_TOKEN", encryptionKey);
    const bot = await prisma.bot.create({
        data: {
            ownerId: user.id,
            name: "Demo Bot",
            description: "Sample bot for local development",
            applicationId: "000000000000000000",
            encryptedToken,
            status: "stopped",
            members: {
                create: {
                    userId: user.id,
                    role: "owner"
                }
            }
        }
    });
    const command = await prisma.command.create({
        data: {
            botId: bot.id,
            name: "hello",
            description: "Say hello",
            type: "SLASH",
            options: [],
            permissions: { adminOnly: false, roleAllowlist: ["Admin"], channelAllowlist: [] },
            cooldownSeconds: 5
        }
    });
    const workflow = {
        version: shared_1.WORKFLOW_SCHEMA_VERSION,
        nodes: [
            {
                id: "trigger",
                type: "SlashCommandTrigger",
                position: { x: 0, y: 0 },
                data: { commandName: "hello" }
            },
            {
                id: "if",
                type: "IfElse",
                position: { x: 200, y: 0 },
                data: {
                    conditions: {
                        op: "AND",
                        rules: [{ left: "memberRoles", operator: "hasRole", right: "Admin" }]
                    }
                }
            },
            {
                id: "embed",
                type: "EmbedMessage",
                position: { x: 400, y: -80 },
                data: {
                    title: "Hello Admin",
                    description: "Welcome back, {{user.username}}",
                    color: "#2ecc71"
                }
            },
            {
                id: "reply",
                type: "ReplyMessage",
                position: { x: 400, y: 80 },
                data: {
                    template: "Hello {{user.username}}. Ask an admin to grant you access."
                }
            },
            {
                id: "stop",
                type: "Stop",
                position: { x: 600, y: 0 },
                data: {}
            }
        ],
        edges: [
            { id: "e1", source: "trigger", target: "if" },
            { id: "e2", source: "if", sourceHandle: "true", target: "embed" },
            { id: "e3", source: "if", sourceHandle: "false", target: "reply" },
            { id: "e4", source: "embed", target: "stop" },
            { id: "e5", source: "reply", target: "stop" }
        ]
    };
    const compiled = (0, shared_1.compileWorkflow)(workflow);
    const compiledJson = JSON.parse(JSON.stringify(compiled));
    const workflowJson = JSON.parse(JSON.stringify(workflow));
    await prisma.commandVersion.create({
        data: {
            commandId: command.id,
            versionNumber: 1,
            status: "published",
            notes: "Demo workflow",
            workflowJson,
            compiledAstJson: compiledJson
        }
    });
    await prisma.botLog.create({
        data: {
            botId: bot.id,
            level: "info",
            message: "Demo bot created",
            meta: { seeded: true }
        }
    });
    console.log("Seeded demo user and bot");
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map