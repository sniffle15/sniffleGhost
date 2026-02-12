FROM node:20-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm -C packages/shared build
RUN pnpm -C apps/api prisma generate
# Force a deterministic build inside Docker even if tsbuildinfo is present in repo/release assets.
RUN rm -rf apps/api/dist && rm -f apps/api/tsconfig.tsbuildinfo && pnpm -C apps/api build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
RUN chmod +x /app/apps/api/docker-entrypoint.sh

EXPOSE 4000

CMD ["sh", "/app/apps/api/docker-entrypoint.sh"]
