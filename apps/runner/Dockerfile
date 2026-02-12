FROM node:20-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/runner ./apps/runner

RUN pnpm -C packages/shared build
RUN rm -rf apps/runner/dist && rm -f apps/runner/tsconfig.tsbuildinfo && pnpm -C apps/runner build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/runner ./apps/runner

CMD ["node", "apps/runner/dist/index.js"]
