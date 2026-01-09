# Multi-stage build for all services
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY api-service/package*.json ./api-service/
COPY socket-service/package*.json ./socket-service/
COPY jobs-service/package*.json ./jobs-service/

# Install dependencies
RUN npm ci --include=dev

# Generate Prisma Client
FROM base AS prisma
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY shared/prisma ./shared/prisma
RUN npx prisma@5.22.0 generate --schema ./shared/prisma/schema.prisma

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
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
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

WORKDIR /app/api-service
RUN npm ci --only=production && npm cache clean --force

WORKDIR /app/socket-service
RUN npm ci --only=production && npm cache clean --force

WORKDIR /app/jobs-service
RUN npm ci --only=production && npm cache clean --force

# Install PM2 globally for pm2-runtime
RUN npm install -g pm2

# Copy PM2 config
COPY --chown=nodejs:nodejs pm2.config.js ./

USER nodejs

EXPOSE 5000 5001 5002

CMD ["pm2-runtime", "start", "pm2.config.js"]

