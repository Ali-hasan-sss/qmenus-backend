# Multi-stage build for all services
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
# Install OpenSSL for Prisma (may be needed during install)
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY api-service/package*.json ./api-service/
COPY socket-service/package*.json ./socket-service/
COPY jobs-service/package*.json ./jobs-service/

# Install root dependencies
# Using npm install instead of npm ci because package-lock.json may be out of sync
# Skip postinstall scripts because Prisma schema is not available yet
RUN npm install --include=dev --ignore-scripts

# Install shared dependencies
WORKDIR /app/shared
RUN npm install --include=dev --ignore-scripts

# Install api-service dependencies
WORKDIR /app/api-service
RUN npm install --include=dev --ignore-scripts

# Install socket-service dependencies
# Skip postinstall scripts because Prisma schema is not available yet
WORKDIR /app/socket-service
RUN npm install --include=dev --ignore-scripts

# Install jobs-service dependencies
# Skip postinstall scripts because Prisma schema is not available yet
WORKDIR /app/jobs-service
RUN npm install --include=dev --ignore-scripts

# Return to root
WORKDIR /app

# Generate Prisma Client
FROM base AS prisma
WORKDIR /app
# Install OpenSSL for Prisma generation
RUN apk add --no-cache openssl openssl-dev libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY shared/prisma ./shared/prisma
RUN npx prisma@5.22.0 generate --schema ./shared/prisma/schema.prisma

# Build stage
FROM base AS builder
WORKDIR /app
# Install OpenSSL for Prisma during build
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copy dependencies from root
COPY --from=deps /app/node_modules ./node_modules

# Copy node_modules from each service (for service-specific devDependencies like typescript)
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/api-service/node_modules ./api-service/node_modules
COPY --from=deps /app/socket-service/node_modules ./socket-service/node_modules
COPY --from=deps /app/jobs-service/node_modules ./jobs-service/node_modules

# Copy Prisma client
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma

# Copy source code
COPY shared ./shared
COPY api-service ./api-service
COPY socket-service ./socket-service
COPY jobs-service ./jobs-service

# Build all services
WORKDIR /app/api-service
RUN npm run build

WORKDIR /app/socket-service
RUN npm run build

WORKDIR /app/jobs-service
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma (required for Prisma to work on Alpine)
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built files
COPY --from=builder --chown=nodejs:nodejs /app/api-service/dist ./api-service/dist
COPY --from=builder --chown=nodejs:nodejs /app/socket-service/dist ./socket-service/dist
COPY --from=builder --chown=nodejs:nodejs /app/jobs-service/dist ./jobs-service/dist

# Copy necessary files
COPY --from=builder --chown=nodejs:nodejs /app/api-service/package*.json ./api-service/
COPY --from=builder --chown=nodejs:nodejs /app/socket-service/package*.json ./socket-service/
COPY --from=builder --chown=nodejs:nodejs /app/jobs-service/package*.json ./jobs-service/
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy scripts
COPY --from=builder --chown=nodejs:nodejs /app/api-service/scripts ./api-service/scripts

# Install production dependencies only
# Using npm install instead of npm ci because package-lock.json may be out of sync
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

WORKDIR /app/api-service
RUN npm install --omit=dev && npm cache clean --force

WORKDIR /app/socket-service
RUN npm install --omit=dev && npm cache clean --force

WORKDIR /app/jobs-service
RUN npm install --omit=dev && npm cache clean --force

# Install PM2 globally for pm2-runtime
RUN npm install -g pm2

# Copy PM2 config
COPY --chown=nodejs:nodejs pm2.config.js ./

USER nodejs

EXPOSE 5000 5001 5002

CMD ["pm2-runtime", "start", "pm2.config.js"]

