#!/bin/sh
set -e

echo "🚀 Starting MyMenus Backend Services..."

# Only wait for PostgreSQL if WAIT_FOR_POSTGRES is explicitly set to "true"
# This allows skipping the wait on platforms like Render where database is external
if [ "$WAIT_FOR_POSTGRES" = "true" ]; then
  echo "⏳ Waiting for PostgreSQL to be ready..."
  DB_HOST="${POSTGRES_HOST:-postgres}"
  DB_PORT="${POSTGRES_PORT:-5432}"
  
  until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
  done
  echo "✅ PostgreSQL is ready!"
else
  echo "⏭️  Skipping PostgreSQL wait (external database or WAIT_FOR_POSTGRES not set)"
  if [ -n "$DATABASE_URL" ]; then
    # Extract host from DATABASE_URL for info
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p' 2>/dev/null || echo "external")
    echo "📊 Using database: $DB_HOST"
  fi
fi

# Check if we should run database initialization
if [ "$RUN_DB_INIT" = "true" ] || [ "$RUN_DB_INIT" = "1" ]; then
  echo "🌱 Running database initialization (migrations + seeding)..."
  node scripts/init-db.js
else
  echo "📋 Skipping database initialization (RUN_DB_INIT not set)"
  echo "💡 To run initialization, set RUN_DB_INIT=true"
fi

# Start all services with PM2
echo "🚀 Starting all services with PM2..."
exec node scripts/start-all.js

