# CineTrack Web — Next.js
# Build context MUST be the monorepo root (see docker-compose.yml: context: .)

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
# Git hooks are irrelevant inside an image and .git is dockerignored.
ENV HUSKY=0
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo ./
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
