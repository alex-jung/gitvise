# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# ─── Stage 1: API dependencies ───────────────────────────────────────────────
FROM base AS deps-api
WORKDIR /build/api
COPY apps/api/package*.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Web dependencies ───────────────────────────────────────────────
FROM base AS deps-web
WORKDIR /build/web
COPY apps/web/package*.json ./
RUN npm ci --ignore-scripts

# ─── Stage 3: Build API ───────────────────────────────────────────────────────
FROM base AS build-api
WORKDIR /build/api
COPY --from=deps-api /build/api/node_modules ./node_modules
COPY apps/api ./
RUN npm run build

# ─── Stage 4: Build Web ───────────────────────────────────────────────────────
FROM base AS build-web
WORKDIR /build/web
COPY --from=deps-web /build/web/node_modules ./node_modules
COPY apps/web ./
RUN npm run build

# ─── Stage 5: Production image ───────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT_API=3001
ENV PORT_WEB=3000

RUN apk add --no-cache dumb-init

# API
COPY --from=build-api /build/api/dist ./api/dist
COPY --from=deps-api  /build/api/node_modules ./api/node_modules

# Web (Next.js standalone)
COPY --from=build-web /build/web/.next/standalone ./web
COPY --from=build-web /build/web/.next/static     ./web/.next/static
COPY --from=build-web /build/web/public/          ./web/public/

# Start script
COPY docker/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]
