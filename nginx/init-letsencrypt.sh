#!/bin/bash

# Script to initialize Let's Encrypt certificates automatically
# Email: emonate8@gmail.com
# Domain: api.qmenussy.com

set -e

# Configuration
# Add both API and Socket domains
domains=(api.qmenussy.com socket.qmenussy.com)
rsa_key_size=4096
email="emonate8@gmail.com"
staging=0 # Set to 1 for testing (avoids rate limits)

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="$SCRIPT_DIR"
BACKEND_DIR="$(dirname "$NGINX_DIR")"
data_path="$BACKEND_DIR/nginx/certbot"

# Change to backend directory
cd "$BACKEND_DIR"

echo "=========================================="
echo "Let's Encrypt SSL Certificate Setup"
echo "=========================================="
echo "Domains: ${domains[*]}"
echo "Email: $email"
echo "=========================================="
echo

# Download recommended TLS parameters if they don't exist
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo "✅ TLS parameters downloaded"
  echo
fi

# Check if certificates already exist (check first domain only for simplicity)
if [ -d "$data_path/conf/live/${domains[0]}" ]; then
  echo "⚠️  Existing certificates found for ${domains[0]}"
  echo "   Skipping certificate generation. Use 'certbot renew' to renew."
  echo "   If you want to regenerate, delete: $data_path/conf/live/${domains[0]}"
  exit 0
fi

# Ensure backend is running first (nginx needs it)
echo "### Ensuring backend services are running..."
docker compose up -d postgres redis backend

echo "### Waiting for backend to be ready..."
sleep 15

# Check if backend is running
if ! docker compose ps backend | grep -q "Up"; then
  echo "❌ Backend service is not running"
  echo "   Checking logs..."
  docker compose logs backend --tail=30
  exit 1
fi

echo "✅ Backend service is running"

# Ensure nginx is using init config (allows HTTP for certbot challenge)
echo "### Preparing nginx for certificate generation ..."

# Create certbot webroot directory
mkdir -p "$data_path/www"

# Start nginx
echo "### Starting nginx ..."
docker compose up -d nginx

# Wait for nginx to be ready
echo "### Waiting for nginx to be ready ..."
sleep 10

# Test if nginx config is valid
if ! docker compose exec -T nginx nginx -t 2>/dev/null; then
    echo "⚠️  Nginx configuration test failed, checking logs..."
    docker compose logs nginx --tail=20
    echo "⚠️  Continuing anyway - nginx may still work..."
fi

echo

# Prepare domain arguments
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Prepare email argument
email_arg="--email $email --agree-tos --no-eff-email"

# Prepare staging argument
if [ $staging != "0" ]; then 
  staging_arg="--staging"
  echo "⚠️  Using staging environment (test mode)"
else
  staging_arg=""
fi

echo "### Requesting Let's Encrypt certificate for ${domains[@]} ..."
echo "   Domains: ${domains[*]}"
echo "   This may take a few minutes..."

# Request certificate (non-interactive, without --force-renewal for initial request)
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  $staging_arg \
  $email_arg \
  $domain_args \
  --rsa-key-size $rsa_key_size \
  --non-interactive

if [ $? -eq 0 ]; then
  echo "✅ Certificate obtained successfully!"
  
  # Switch to SSL-enabled nginx config
  echo "### Switching to SSL-enabled nginx configuration ..."
  
  # Stop nginx
  docker compose stop nginx
  
  # Update docker-compose.yml to use nginx-certs.conf
  echo "### Updating docker-compose.yml to use SSL config ..."
  if command -v sed &> /dev/null; then
    sed -i.bak "s|nginx-init.conf|nginx-certs.conf|g" docker-compose.yml
    echo "✅ Updated docker-compose.yml"
  else
    echo "⚠️  Please manually update docker-compose.yml:"
    echo "   Change: nginx-init.conf -> nginx-certs.conf in nginx volumes"
  fi
  
  # Start nginx with SSL config
  echo "### Starting nginx with SSL configuration ..."
  docker compose up -d nginx
  sleep 5
  
  # Test nginx config
  if docker compose exec nginx nginx -t; then
    echo "✅ Nginx SSL configuration is valid"
  else
    echo "❌ Nginx SSL configuration test failed"
    docker compose logs nginx --tail=20
    exit 1
  fi
  
  echo "=========================================="
  echo "✅ SSL Certificate Setup Complete!"
  echo "=========================================="
  echo "Certificate location: $data_path/conf/live/${domains[0]}"
  echo "   (Single certificate for both domains: ${domains[*]})"
  echo ""
  echo "Your services are now accessible at:"
  echo "  📡 API:     https://${domains[0]}"
  echo "  🔌 Socket:  https://${domains[1]}"
  echo ""
  echo "For frontend configuration (.env.local):"
  echo "  NEXT_PUBLIC_API_URL=https://${domains[0]}"
  echo "  NEXT_PUBLIC_SOCKET_URL=https://${domains[1]}"
  echo ""
  echo "Certificates will auto-renew via certbot service."
  echo ""
  echo "⚠️  IMPORTANT: Make sure to add A record for ${domains[1]}:"
  echo "   Type: A"
  echo "   Name: socket"
  echo "   Value: <YOUR_SERVER_IP>"
else
  echo "❌ Failed to obtain certificate"
  echo "   Please check the logs: docker compose logs certbot"
  exit 1
fi
