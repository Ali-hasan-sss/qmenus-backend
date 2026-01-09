#!/bin/bash

# Deployment script for QMenus Backend
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "⚠️  SSL certificates not found. Running setup-ssl.sh..."
    ./scripts/setup-ssl.sh
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p nginx/logs
mkdir -p api-service/logs
mkdir -p socket-service/logs
mkdir -p jobs-service/logs

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build images
echo "🔨 Building Docker images..."
docker-compose build --no-cache

# Start services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T backend npx prisma@5.22.0 migrate deploy --schema /app/shared/prisma/schema.prisma || true

# Seed database if needed
echo "🌱 Seeding database..."
docker-compose exec -T backend node /app/api-service/scripts/check-and-seed.js || true

echo "✅ Deployment complete!"
echo "📊 View logs with: docker-compose logs -f"
echo "🌐 API URL: https://api.qmenussy.com"
