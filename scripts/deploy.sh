#!/bin/bash

# Deployment script for QMenus Backend (Without Docker)
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or higher."
    exit 1
fi

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p nginx/logs
mkdir -p api-service/logs
mkdir -p socket-service/logs
mkdir -p jobs-service/logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install shared dependencies
echo "📦 Installing shared dependencies..."
cd shared
npm install
cd ..

# Install api-service dependencies
echo "📦 Installing api-service dependencies..."
cd api-service
npm install
cd ..

# Install socket-service dependencies
echo "📦 Installing socket-service dependencies..."
cd socket-service
npm install
cd ..

# Install jobs-service dependencies
echo "📦 Installing jobs-service dependencies..."
cd jobs-service
npm install
cd ..

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
cd shared
npx prisma@5.22.0 generate --schema ./prisma/schema.prisma
cd ..

# Build all services
echo "🔨 Building all services..."
npm run build:all

# Run database migrations
echo "🗄️  Running database migrations..."
cd shared
npx prisma@5.22.0 migrate deploy --schema ./prisma/schema.prisma || echo "⚠️  Migration skipped or failed"
cd ..

# Seed database if needed
echo "🌱 Checking database seed..."
cd api-service
node scripts/check-and-seed.js || echo "⚠️  Seed skipped or failed"
cd ..

# Stop existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop pm2.config.js || true
pm2 delete pm2.config.js || true

# Start services with PM2
echo "▶️  Starting services with PM2..."
pm2 start pm2.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo "⚙️  Setting up PM2 startup script..."
pm2 startup || echo "⚠️  Startup script setup may require sudo"

echo "✅ Deployment complete!"
echo "📊 View logs with: pm2 logs"
echo "📊 View status with: pm2 status"
echo "🌐 API URL: http://localhost:5000"
echo "🌐 Socket URL: http://localhost:5001"
