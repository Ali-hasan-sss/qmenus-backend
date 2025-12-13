#!/bin/sh
set -e

echo "🚀 Starting MyMenus Backend Services..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until nc -z postgres 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "✅ PostgreSQL is ready!"

# Check if we should run database initialization
if [ "$RUN_DB_INIT" = "true" ] || [ "$RUN_DB_INIT" = "1" ]; then
  echo "🌱 Running database initialization (migrations + seeding)..."
  node scripts/init-db.js
else
  echo "📋 Skipping database initialization (RUN_DB_INIT not set)"
  echo "💡 To run initialization, set RUN_DB_INIT=true in docker-compose.yml"
fi

# Start all services with PM2
echo "🚀 Starting all services with PM2..."
exec node scripts/start-all.js

