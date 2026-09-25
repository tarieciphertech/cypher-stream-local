# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/api-server/build.mjs artifacts/api-server/build.mjs
COPY artifacts/api-server/tsconfig.json artifacts/api-server/tsconfig.json
COPY artifacts/api-server/src artifacts/api-server/src
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-zod/src lib/api-zod/src
COPY lib/db/package.json lib/db/package.json
COPY lib/db/src lib/db/src
COPY lib/db/drizzle.config.ts lib/db/drizzle.config.ts

# The workspace contains Replit-oriented platform overrides. The API build
# runs on ARM64, so restore esbuild's ARM64 optional package inside the image.
RUN sed -i '/esbuild>@esbuild\/linux-arm64/d' pnpm-workspace.yaml \
    && pnpm install --no-frozen-lockfile --filter @workspace/api-server... \
    && pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build /workspace/artifacts/api-server/dist ./dist

# The bundled API keeps runtime dependencies minimal. Run as the unprivileged
# node user provided by the official Node image.
USER node

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
