#!/bin/bash

# Script to setup SSL certificates for Nginx
# Usage: ./scripts/setup-ssl.sh

set -e

DOMAIN="api.qmenussy.com"
SSL_DIR="./nginx/ssl"

echo "🔐 Setting up SSL certificates for $DOMAIN"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot is not installed. Installing..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Create SSL directory
mkdir -p "$SSL_DIR"

# Check if certificates already exist
if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
    echo "⚠️  SSL certificates already exist in $SSL_DIR"
    read -p "Do you want to renew them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Renewing certificates..."
        sudo certbot renew
    else
        echo "✅ Using existing certificates"
        exit 0
    fi
else
    echo "📝 Generating new certificates..."
    sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@qmenussy.com
fi

# Copy certificates to nginx directory
echo "📋 Copying certificates to $SSL_DIR..."
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"

# Set proper permissions
sudo chmod 644 "$SSL_DIR/cert.pem"
sudo chmod 600 "$SSL_DIR/key.pem"
sudo chown $USER:$USER "$SSL_DIR/cert.pem"
sudo chown $USER:$USER "$SSL_DIR/key.pem"

echo "✅ SSL certificates setup complete!"
echo "📁 Certificates location: $SSL_DIR"
