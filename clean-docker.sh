#!/bin/bash

# Script to clean Docker resources

echo "🧹 Cleaning Docker resources..."

# Stop all containers
echo ""
echo "📦 Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove all stopped containers
echo "🗑️ Removing stopped containers..."
docker container prune -f

# Remove all unused images
echo "🖼️ Removing unused images..."
docker image prune -a -f

# Remove all unused volumes
echo "💾 Removing unused volumes..."
docker volume prune -f

# Remove all unused networks
echo "🌐 Removing unused networks..."
docker network prune -f

# Show disk space
echo ""
echo "💿 Docker disk usage:"
docker system df

echo ""
echo "✅ Cleanup complete!"

