# sniffleGhost (Bot Hosting + Command Builder)

A local-first monorepo that ships a Discord bot hosting platform with a visual command builder, API, and runner.

**Stack**
- Monorepo: pnpm workspaces
- Frontend: Next.js (App Router) + TailwindCSS + shadcn/ui + React Hook Form + Zod
- Builder: React Flow + Zustand
- Backend: NestJS + Prisma + PostgreSQL
- Queue: Redis + BullMQ
- Runner: discord.js

## Architecture
- `apps/web`: Next.js UI for bots, commands, and the visual builder.
- `apps/api`: NestJS REST API + Prisma. Handles auth, bots, commands, versions, validation, logs, and job enqueue.
- `apps/runner`: Discord bot runner. Processes BullMQ jobs, connects bots, syncs commands, executes workflows.
- `packages/shared`: Shared types, Zod schemas, workflow validation/compile/execute utilities.
RBAC: bot members can be `owner`, `editor`, or `viewer` (MVP UI only manages the owner).

## Quick Start

### 1) Install dependencies
```bash
pnpm install
```

### 2) Environment setup
Copy the `.env.example` files:
- `apps/api/.env.example` ? `apps/api/.env`
- `apps/web/.env.example` ? `apps/web/.env`
- `apps/runner/.env.example` ? `apps/runner/.env`

Windows (PowerShell) quick copy:
```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/runner/.env.example apps/runner/.env
```

### 3) Start services
```bash
pnpm dev
```
This runs:
- `docker compose up -d` (Postgres + Redis)
- `apps/api`, `apps/web`, `apps/runner`, and `packages/shared` in dev mode

## Production Warning
The commands in this file are for local development only.

On a server, do not run plain:
```bash
docker compose up -d
```
because that starts only the local DB stack from `docker-compose.yml`.

Use production commands instead:
```bash
pnpm prod:restart
pnpm prod:migrate
pnpm prod:logs
```

### 4) Initialize DB (first time only)
```bash
pnpm db:migrate -- --name init
pnpm db:generate
pnpm db:seed
```

Seeded demo user (legacy local auth):
- `demo@local.dev`
- `password123`

API docs: `http://localhost:4000/docs`
Web app: `http://localhost:3000`

## Discord Setup (Bot)
1. Go to Discord Developer Portal and create a new Application.
2. Add a Bot user and copy:
   - **Application ID** (Client ID)
   - **Bot token**
3. Enable intents:
   - `Server Members Intent`
   - `Message Content Intent`
4. Create a test guild (server) and invite the bot.
5. Add your token + application ID in the UI (Bot create form).
6. Optional: set **Test Guild ID** for fast slash-command sync.

## Discord OAuth Setup (Login)
1. In the Discord Developer Portal, open your application and go to **OAuth2**.
2. Add redirect URL: `http://localhost:4000/auth/discord/callback`
3. Copy **Client ID** and **Client Secret** into `apps/api/.env`:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
4. Set `WEB_URL=http://localhost:3000` in `apps/api/.env`
5. Restart `pnpm dev`, then login via `/login` (Discord button).

## Key Endpoints
Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/discord/login`
- `GET /auth/discord/callback`
- `GET /auth/me`

Bots:
- `GET /bots`
- `POST /bots`
- `GET /bots/:id`
- `PATCH /bots/:id`
- `DELETE /bots/:id` (owner only, permanent hard delete + stop job)
- `POST /bots/:id/start`
- `POST /bots/:id/stop`
- `GET /bots/:id/logs?limit=200`
- `GET /bots/:id/log-stream` (SSE)

Commands + Versions:
- `GET /bots/:id/commands`
- `POST /bots/:id/commands`
- `GET /commands/:id`
- `PATCH /commands/:id`
- `POST /commands/:id/versions`
- `GET /commands/:id/versions`
- `GET /versions/:id`
- `PATCH /versions/:id`
- `POST /versions/:id/validate`
- `POST /versions/:id/publish`
- `POST /versions/:id/test-run`

## Tests
```bash
pnpm test
```
Includes unit tests for workflow validation + execution engine in `packages/shared`.

## Demo Workflow
Seed creates a `/hello` slash command:
- If user has role `Admin`, send an embed.
- Else send a reply asking for access.

## Security Notes
- Bot tokens are encrypted (AES-256-GCM) using `ENCRYPTION_KEY`.
- Optional key rotation support: set previous keys in `ENCRYPTION_KEY_FALLBACKS` (comma-separated).
- Passwords are stored as bcrypt hashes.
- JWT access + refresh tokens, refresh tokens stored hashed.
- Cooldowns enforced in runner via Redis.

## Notes
- SSE log streaming uses `token` query param so EventSource can authenticate.
- `pnpm dev` is your daily driver (starts DB + all services).
- Windows: ensure Docker Desktop is running and WSL2 is enabled (recommended).

## Next Steps (optional)
- Add OAuth providers for login.
- Add more node templates and advanced variable editor.
- Extend execution logs to include per-node tracing in DB.
