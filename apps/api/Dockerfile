# CineTrack API — NestJS
# Build context MUST be the monorepo root (see docker-compose.yml: context: .)

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo ./
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["pnpm", "start:prod"]
