#!/bin/bash

# Script to renew SSL certificates and reload nginx
# Usage: ./nginx/renew-ssl.sh
# Can be added to crontab for auto-renewal

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
data_path="$BACKEND_DIR/nginx/certbot"

cd "$BACKEND_DIR"

echo "🔄 Renewing SSL certificates..."

# Ensure webroot directory exists
mkdir -p "$data_path/www/.well-known/acme-challenge"

sudo certbot renew \
  --webroot \
  --webroot-path="$data_path/www" \
  --config-dir "$data_path/conf" \
  --work-dir "$data_path/work" \
  --logs-dir "$data_path/logs" \
  --quiet

if [ $? -eq 0 ]; then
  echo "✅ Certificates renewed successfully"
  
  # Reload nginx to use renewed certificates
  echo "🔄 Reloading nginx..."
  sudo systemctl reload nginx || sudo service nginx reload
  
  echo "✅ SSL renewal complete!"
else
  echo "⚠️  No certificates needed renewal"
fi
