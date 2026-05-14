# syntax=docker/dockerfile:1.7

# ============================================================================
# MaxVision X MCP — multi-stage Dockerfile
#
# Build context: REPO ROOT (NOT mcp-server/) — needed so we can COPY mcp-server/*
# Build local:   docker buildx build -f mcp-server/docker/Dockerfile .
# Multi-arch:    linux/amd64 + linux/arm64 (CI handles QEMU + buildx).
#
# Stages:
#   1. builder — pnpm install (frozen-lockfile), tsc build, prune dev deps
#   2. runner  — debian:bookworm-slim runtime, Chromium libs (Layer D), non-root
# ============================================================================

# ----- builder -----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    DEBIAN_FRONTEND=noninteractive

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl python3 python3-pip build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY mcp-server/package.json mcp-server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY mcp-server/tsconfig.json mcp-server/tsconfig.build.json mcp-server/drizzle.config.ts ./
COPY mcp-server/src ./src
COPY mcp-server/drizzle ./drizzle
RUN pnpm run build

RUN pnpm prune --prod --ignore-workspace

# ----- runner -----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    MCP_TRANSPORT=http \
    MCP_PORT=3000 \
    DEBIAN_FRONTEND=noninteractive \
    PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    PROFILE_BASE_DIR=/data/profiles \
    DISPLAY=:99

RUN apt-get update && apt-get install -y --no-install-recommends \
        wget ca-certificates dumb-init \
        xvfb xauth \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
        libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
        libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
        libatspi2.0-0 libxshmfence1 libgtk-3-0 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./

# Patchright (Layer D) — Chromium bundle (~400MB)
RUN npx --yes patchright install chromium \
    || npx --yes playwright install chromium

RUN mkdir -p /data/profiles

RUN useradd -m -u 1001 -s /bin/bash app && \
    chown -R app:app /app /data/profiles && \
    mkdir -p /home/app/.cache && \
    if [ -d /root/.cache/ms-playwright ]; then \
        cp -r /root/.cache/ms-playwright /home/app/.cache/ms-playwright; \
    fi && \
    if [ -d /root/.cache/patchright ]; then \
        cp -r /root/.cache/patchright /home/app/.cache/patchright; \
    fi && \
    chown -R app:app /home/app/.cache

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1920x1080x24 -ac +extension GLX +render -noreset", "node", "dist/server.js"]
