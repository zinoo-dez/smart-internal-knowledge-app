# ==========================================
# Production Dockerfile for NestJS API
# Multi-stage, non-root, minimal footprint
# ==========================================

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app

# --- Stage 1: Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
RUN npm ci

# --- Stage 2: Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma Client
RUN npm run db:generate --workspace=@knowledge/database

# Build API and dependencies
RUN npx turbo run build --filter=@knowledge/api...

# Prune devDependencies for minimal runtime
RUN npm prune --production

# --- Stage 3: Runner ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

# Run as non-root node user
USER node

WORKDIR /app

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
