FROM node:20-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm -C packages/shared build
RUN rm -rf apps/web/.next && rm -f apps/web/tsconfig.tsbuildinfo && pnpm -C apps/web build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web ./apps/web

EXPOSE 3000

CMD ["pnpm", "-C", "apps/web", "start"]
