# sniffleGhost (Bot Hosting + Command Builder)
# Local Testing Stuff intigrated, because it is still in beta
# test test test

sniffleGhost is a monorepo for hosting Discord bots with a visual workflow builder:
- `apps/web`: Next.js dashboard and builder UI
- `apps/api`: NestJS API + Prisma
- `apps/runner`: discord.js runner worker
- `packages/shared`: shared schemas, workflow compile/execute/validation

## Stack
- Monorepo: `pnpm workspaces`
- Frontend: `Next.js`, `TailwindCSS`, `React Hook Form`, `Zod`, `React Flow`, `Zustand`
- Backend: `NestJS`, `Prisma`, `PostgreSQL`
- Queue/Jobs: `Redis`, `BullMQ`
- Runner: `discord.js`

## Local Development
### 1) Install
```bash
pnpm install
```

### 2) Configure env files
```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/runner/.env.example apps/runner/.env
```

### 3) Start all services
```bash
pnpm dev
```

### 4) First-time DB setup
```bash
pnpm db:migrate -- --name init
pnpm db:generate
pnpm db:seed
```

### Local URLs
- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API docs: `http://localhost:4000/docs`

---

## Production Server Hosting (Docker Compose)
This repository now includes a production deployment setup:
- `docker-compose.prod.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/runner/Dockerfile`
- `.env.production.example`

### Prerequisites
- Linux server (Ubuntu 22.04+ recommended)
- Docker + Docker Compose plugin
- Open ports: `80/443` (reverse proxy) and/or `3000/4000` if direct access
- Domain(s) recommended:
  - `app.example.com` -> web
  - `api.example.com` -> api

### 1) Prepare production env file
```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set real values:
- `WEB_PUBLIC_URL`
- `API_PUBLIC_URL`
- `POSTGRES_*`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `RUNNER_SECRET`
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
- `NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS`

Important:
- `ENCRYPTION_KEY` must be stable (do not rotate casually, or keep old keys in `ENCRYPTION_KEY_FALLBACKS`).
- `RUNNER_SECRET` must match for `api` and `runner` (same value in this env file).
- `DISCORD_REDIRECT_URI` must exactly match your Discord OAuth callback URL.

### 2) Build and start production stack
```bash
pnpm prod:up
```

### 3) Run Prisma migrations in production
```bash
pnpm prod:migrate
```

### 4) (Optional) Seed demo data
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api pnpm -C apps/api prisma db seed
```

### 5) Check logs
```bash
pnpm prod:logs
```

### 6) Stop stack
```bash
pnpm prod:down
```

---

## Recommended Reverse Proxy
For real hosting, place Nginx/Caddy in front of:
- web service on `:3000`
- api service on `:4000`

Then set:
- `WEB_PUBLIC_URL=https://app.example.com`
- `API_PUBLIC_URL=https://api.example.com`
- `NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS=app.example.com`
- `DISCORD_REDIRECT_URI=https://api.example.com/auth/discord/callback`

If you host behind Cloudflare/Traefik/Caddy, keep TLS termination there and proxy to the internal Docker ports.

---

## Production Update Workflow
```bash
git pull
pnpm install --frozen-lockfile
pnpm prod:up
pnpm prod:migrate
```

---

## Backup and Restore (PostgreSQL)
### Backup
```bash
docker exec -t sniffleghost-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

### Restore
```bash
cat backup.sql | docker exec -i sniffleghost-postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

---

## Security Notes
- Bot tokens are encrypted at rest via `ENCRYPTION_KEY` (AES-256-GCM in API layer).
- JWT access/refresh are signed by separate secrets.
- Redis/Postgres are internal-only in `docker-compose.prod.yml` (not published externally).
- Keep `.env.production` private and never commit it.

---

## Useful Commands
- Start prod: `pnpm prod:up`
- Prod migrations: `pnpm prod:migrate`
- Follow logs: `pnpm prod:logs`
- Stop prod: `pnpm prod:down`
- Full typecheck: `pnpm typecheck`
