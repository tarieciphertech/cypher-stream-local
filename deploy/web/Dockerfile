FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /workspace
COPY . .
ARG VITE_APP_ENV=production
ARG VITE_API_URL=/api
ARG VITE_MEDIA_BASE_URL=/media
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MEDIA_BASE_URL=$VITE_MEDIA_BASE_URL
RUN pnpm install --no-frozen-lockfile --filter @workspace/cypher-stream...
RUN pnpm --filter @workspace/cypher-stream run build

FROM nginx:1.29-alpine
COPY --from=build /workspace/artifacts/cypher-stream/dist /usr/share/nginx/html
EXPOSE 80
