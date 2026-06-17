FROM oven/bun:1-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1-alpine AS frontend-builder
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN apk add --no-cache ffmpeg tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_PORT=4000
ENV API_HOST=0.0.0.0
ENV LIBRARY_ROOT=/library

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json ./frontend/package.json
COPY --from=frontend-builder /app/frontend/next.config.ts ./frontend/next.config.ts

EXPOSE 3000 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "bun /app/backend/src/server.ts & cd /app/frontend && bun run start"]
