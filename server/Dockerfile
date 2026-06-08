# Market Bubble hub — persistent WebSocket + HTTP aggregator.
# Needs curl: the Kick chatroom-id lookup uses `curl --http1.1` to pass
# Cloudflare's TLS fingerprint check (Node's fetch fails it).
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# App source (server/ is the build context).
COPY . .

# The host injects PORT; the hub reads process.env.PORT.
ENV NODE_ENV=production
EXPOSE 8080

# Liveness check (the hub serves /health unauthenticated).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT:-8080}/health" || exit 1

CMD ["node", "index.js"]
