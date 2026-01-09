#!/bin/bash

# Automated SSL Certificate Setup Script
# This script sets up Let's Encrypt certificates automatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
NGINX_DIR="$BACKEND_DIR/nginx"

cd "$BACKEND_DIR"

echo "=========================================="
echo "Automated SSL Certificate Setup"
echo "=========================================="

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found. Please run this script from the backend directory."
    exit 1
fi

# Run the init script
echo "Running certificate initialization..."
bash "$NGINX_DIR/init-letsencrypt.sh"

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo "Certificates are stored in: nginx/certbot/conf/live/api.qmenussy.com"
echo "Auto-renewal is configured via certbot service in docker-compose.yml"
echo ""
