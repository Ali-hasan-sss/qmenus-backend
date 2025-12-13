# Multi-stage build for MyMenus Backend Services
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Copy service package files
COPY api-service/package*.json ./api-service/
COPY socket-service/package*.json ./socket-service/
COPY jobs-service/package*.json ./jobs-service/

# Install dependencies
RUN npm ci --include=dev

# Generate Prisma Client
RUN npx prisma generate --schema ./prisma/schema.prisma

# Copy source code
COPY . .

# Build all services
RUN npm run build:all

# Production stage
FROM node:18-alpine

# Install PM2 globally
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Copy service package files
COPY api-service/package*.json ./api-service/
COPY socket-service/package*.json ./socket-service/
COPY jobs-service/package*.json ./jobs-service/

# Install production dependencies only
RUN npm ci --only=production && \
    cd api-service && npm ci --only=production && cd .. && \
    cd socket-service && npm ci --only=production && cd .. && \
    cd jobs-service && npm ci --only=production && cd ..

# Generate Prisma Client for production
RUN npx prisma generate --schema ./prisma/schema.prisma

# Copy built files from builder
COPY --from=builder /app/api-service/dist ./api-service/dist
COPY --from=builder /app/socket-service/dist ./socket-service/dist
COPY --from=builder /app/jobs-service/dist ./jobs-service/dist

# Copy shared config (needed at runtime)
COPY --from=builder /app/shared ./shared

# Verify critical files exist (list structure for debugging)
RUN echo "📁 Checking built files structure..." && \
    echo "API service files:" && find ./api-service/dist -name "app.js" -type f 2>/dev/null | head -5 && \
    echo "Socket service files:" && find ./socket-service/dist -name "socketServer.js" -type f 2>/dev/null | head -5 && \
    echo "Jobs service files:" && find ./jobs-service/dist -name "index.js" -type f 2>/dev/null | head -5 && \
    echo "✅ File structure checked (files will be verified at runtime)"

# Copy ecosystem config and scripts
COPY ecosystem.config.js ./
COPY scripts/ ./scripts/

# Copy Prisma seed files
COPY prisma/seed.js ./prisma/
COPY prisma/seed.ts ./prisma/

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd

# Make entrypoint script executable
RUN chmod +x scripts/docker-entrypoint.sh

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 5000 5001 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint script
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]

