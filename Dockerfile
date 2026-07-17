# Multi-stage build for Next.js SSR (standalone output).
# NOTE: all NEXT_PUBLIC_* values are inlined into the JS bundle at BUILD time —
# they must be passed as --build-arg, not as runtime env (see DEPLOYMENT.md).
# Debian-based image (not alpine): better-sqlite3 ships glibc prebuilds.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Deployment configuration — see DEPLOYMENT.md for what goes in each.
ARG NEXT_PUBLIC_DEFAULT_NETWORK=testnet
ARG NEXT_PUBLIC_BET_BLUEPRINT_ID
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_HATHOR_NODE_URL_TESTNET=https://node-partners.testnet.hathor.network/v1a
ARG NEXT_PUBLIC_HATHOR_NODE_URL_MAINNET=https://node-partners.mainnet.hathor.network/v1a

ENV NEXT_PUBLIC_DEFAULT_NETWORK=${NEXT_PUBLIC_DEFAULT_NETWORK}
ENV NEXT_PUBLIC_BET_BLUEPRINT_ID=${NEXT_PUBLIC_BET_BLUEPRINT_ID}
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}
ENV NEXT_PUBLIC_HATHOR_NODE_URL_TESTNET=${NEXT_PUBLIC_HATHOR_NODE_URL_TESTNET}
ENV NEXT_PUBLIC_HATHOR_NODE_URL_MAINNET=${NEXT_PUBLIC_HATHOR_NODE_URL_MAINNET}
ENV NEXT_PUBLIC_USE_MOCK_WALLET=false
ENV NEXT_TELEMETRY_DISABLED=1
# standalone output is Docker-only (see next.config.js)
ENV NEXT_OUTPUT=standalone

RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Non-root user; /app/data holds the SQLite market registry (mount a volume here)
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m nextjs && \
    mkdir -p /app/data && \
    chown -R nextjs:nodejs /app

USER nextjs

VOLUME /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
