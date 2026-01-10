#!/bin/bash

# Script to initialize Let's Encrypt certificates directly from server (without Docker)
# Email: emonate8@gmail.com
# Domain: api.qmenussy.com and socket.qmenussy.com

set -e

# Configuration
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
echo "Let's Encrypt SSL Certificate Setup (Server Mode - No Docker)"
echo "=========================================="
echo "Domains: ${domains[*]}"
echo "Email: $email"
echo "=========================================="
echo

# Check if certbot is installed on the server
if ! command -v certbot &> /dev/null; then
  echo "❌ Certbot is not installed on the server."
  echo "   Installing certbot..."
  sudo apt-get update
  sudo apt-get install -y certbot
fi

# Download recommended TLS parameters if they don't exist
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo "✅ TLS parameters downloaded"
  echo
fi

# Check if certificates already exist
if [ -d "$data_path/conf/live/${domains[0]}" ]; then
  echo "⚠️  Existing certificates found for ${domains[0]}"
  echo "   Skipping certificate generation. Use 'certbot renew' to renew."
  echo "   If you want to regenerate, delete: $data_path/conf/live/${domains[0]}"
  exit 0
fi

# Ensure all required directories exist
echo "### Creating required directories ..."
mkdir -p "$data_path/www/.well-known/acme-challenge"
mkdir -p "$data_path/conf"
mkdir -p "$data_path/work"
mkdir -p "$data_path/logs"
chmod -R 755 "$data_path/www" 2>/dev/null || true
echo "✅ Directories created: $data_path/www/.well-known/acme-challenge"

# Ensure backend services are running (PM2)
echo "### Ensuring backend services are running..."
if ! command -v pm2 &> /dev/null; then
  echo "❌ PM2 is not installed. Please install PM2 first."
  exit 1
fi

# Check if services are running
if pm2 list | grep -q "online"; then
  echo "✅ Backend services are running (PM2)"
else
  echo "⚠️  Backend services are not running. Starting them..."
  if [ -f "pm2.config.js" ]; then
    pm2 start pm2.config.js || echo "⚠️  Failed to start services, continuing anyway..."
  else
    echo "⚠️  pm2.config.js not found. Please start services manually."
  fi
fi

# Wait for services to be ready
echo "### Waiting for services to be ready..."
sleep 5

# Check if services are listening on ports
if ! netstat -tuln 2>/dev/null | grep -q ":5000" && ! ss -tuln 2>/dev/null | grep -q ":5000"; then
  echo "⚠️  Service on port 5000 may not be running"
  echo "   Check with: pm2 status"
fi

# Ensure nginx is installed and configured
echo "### Checking nginx..."
if ! command -v nginx &> /dev/null; then
  echo "❌ Nginx is not installed. Installing nginx..."
  sudo apt-get update
  sudo apt-get install -y nginx
fi

# Copy nginx init config if not already configured
NGINX_CONFIG_PATH="/etc/nginx/sites-available/qmenus-backend"
if [ ! -f "$NGINX_CONFIG_PATH" ]; then
  echo "### Setting up nginx configuration..."
  sudo cp "$NGINX_DIR/nginx-init.conf" "$NGINX_CONFIG_PATH"
  
  # Create symlink if it doesn't exist
  if [ ! -L "/etc/nginx/sites-enabled/qmenus-backend" ]; then
    sudo ln -s "$NGINX_CONFIG_PATH" /etc/nginx/sites-enabled/
  fi
  
  # Remove default nginx site if it exists
  sudo rm -f /etc/nginx/sites-enabled/default
  
  # Update webroot path in nginx config
  sudo sed -i "s|/var/www/certbot|$data_path/www|g" "$NGINX_CONFIG_PATH"
fi

# Test nginx configuration
echo "### Testing nginx configuration..."
if sudo nginx -t; then
  echo "✅ Nginx configuration is valid"
else
  echo "❌ Nginx configuration test failed"
  exit 1
fi

# Start/restart nginx
echo "### Starting/restarting nginx..."
sudo systemctl restart nginx || sudo service nginx restart

# Wait for nginx to be ready
echo "### Waiting for nginx to be ready..."
sleep 5

# Check if nginx is running
if sudo systemctl is-active --quiet nginx || pgrep nginx > /dev/null; then
  echo "✅ Nginx is running"
else
  echo "❌ Nginx is not running"
  exit 1
fi

# Verify challenge directory is accessible via nginx
echo "### Verifying challenge directory setup..."
if [ -d "$data_path/www/.well-known/acme-challenge" ]; then
  echo "✅ Challenge directory exists: $data_path/www/.well-known/acme-challenge"
else
  echo "❌ Failed to create challenge directory"
  exit 1
fi

# Make sure directory is writable
chmod -R 755 "$data_path/www" 2>/dev/null || sudo chmod -R 755 "$data_path/www"

echo "✅ Ready for certificate generation"
echo "   Certbot will verify HTTP challenge automatically during request"
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
echo "   Webroot: $data_path/www"
echo "   This may take 1-3 minutes..."
echo

# Request certificate using certbot
sudo certbot certonly \
  --webroot \
  --webroot-path="$data_path/www" \
  $staging_arg \
  $email_arg \
  $domain_args \
  --rsa-key-size $rsa_key_size \
  --non-interactive \
  --verbose \
  --config-dir "$data_path/conf" \
  --work-dir "$data_path/work" \
  --logs-dir "$data_path/logs"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Certificate obtained successfully!"
  
  # Switch to SSL-enabled nginx config
  echo "### Switching to SSL-enabled nginx configuration ..."
  
  # Copy SSL nginx config
  sudo cp "$NGINX_DIR/nginx-certs.conf" "$NGINX_CONFIG_PATH"
  
  # Update certificate paths in nginx config (certificates are in standard location)
  # Let's Encrypt stores certificates in standard location: /etc/letsencrypt/live/
  # But we're using custom location, so we need to update paths
  sudo sed -i "s|/etc/letsencrypt/live/api.qmenussy.com|$data_path/conf/live/api.qmenussy.com|g" "$NGINX_CONFIG_PATH"
  
  # Test nginx configuration
  if sudo nginx -t; then
    echo "✅ Nginx SSL configuration is valid"
  else
    echo "❌ Nginx SSL configuration test failed"
    sudo nginx -t
    exit 1
  fi
  
  # Reload nginx
  echo "### Reloading nginx with SSL configuration ..."
  sudo systemctl reload nginx || sudo service nginx reload
  
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
  echo "Certificates will auto-renew via certbot service or cron job."
  echo ""
  echo "To set up auto-renewal, add to crontab:"
  echo "  0 3 * * * certbot renew --quiet --webroot --webroot-path=$data_path/www --config-dir $data_path/conf --work-dir $data_path/work --logs-dir $data_path/logs && sudo systemctl reload nginx"
else
  echo ""
  echo "❌ Failed to obtain certificate"
  echo "   Please check the logs: $data_path/logs/letsencrypt.log"
  exit 1
fi
